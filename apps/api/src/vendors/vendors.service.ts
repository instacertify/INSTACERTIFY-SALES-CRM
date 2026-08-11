import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: { type?: string; search?: string; active?: string }) {
    const where: Prisma.VendorWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.active === 'true') where.active = true;
    if (query.active === 'false') where.active = false;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.vendor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        partnerLab: { select: { id: true, name: true, nabl: true } },
        _count: { select: { purchaseOrders: true, expenses: true } },
      },
    });
  }

  async get(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        partnerLab: true,
        purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 20 },
        expenses: { orderBy: { spentAt: 'desc' }, take: 20 },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  create(body: {
    name: string;
    type?: string;
    email?: string;
    phone?: string;
    country?: string;
    city?: string;
    gstin?: string;
    address?: string;
    notes?: string;
    partnerLabId?: string;
  }) {
    return this.prisma.vendor.create({
      data: {
        name: body.name,
        type: body.type,
        email: body.email,
        phone: body.phone,
        country: body.country,
        city: body.city,
        gstin: body.gstin,
        address: body.address,
        notes: body.notes,
        partnerLabId: body.partnerLabId,
      },
    });
  }

  async update(
    id: string,
    body: Partial<{
      name: string;
      type: string;
      email: string | null;
      phone: string | null;
      country: string;
      city: string | null;
      gstin: string | null;
      address: string | null;
      notes: string | null;
      active: boolean;
      partnerLabId: string | null;
    }>,
  ) {
    await this.get(id);
    return this.prisma.vendor.update({ where: { id }, data: body });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.vendor.delete({ where: { id } });
  }
}
