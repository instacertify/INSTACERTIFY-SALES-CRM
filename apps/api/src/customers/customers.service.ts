import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: { status?: string; search?: string }) {
    const where: Prisma.CustomerWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { company: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        contacts: true,
        _count: { select: { projects: true, opportunities: true } },
      },
    });
  }

  async get(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        projects: {
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        opportunities: true,
        quotations: true,
        invoices: true,
        documents: true,
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  create(body: {
    company: string;
    legalName?: string;
    email: string;
    phone?: string;
    country?: string;
    state?: string;
    city?: string;
    address?: string;
    gstin?: string;
    status?: string;
    notes?: string;
  }) {
    return this.prisma.customer.create({
      data: {
        company: body.company,
        legalName: body.legalName,
        email: body.email.toLowerCase(),
        phone: body.phone,
        country: body.country ?? 'India',
        state: body.state,
        city: body.city,
        address: body.address,
        gstin: body.gstin,
        status: body.status,
        notes: body.notes,
        lastActivityAt: new Date(),
      },
      include: { contacts: true },
    });
  }

  async update(
    id: string,
    body: {
      company?: string;
      legalName?: string | null;
      email?: string;
      phone?: string | null;
      country?: string;
      state?: string | null;
      city?: string | null;
      address?: string | null;
      gstin?: string | null;
      status?: string;
      notes?: string | null;
      lifetimeValue?: number;
    },
  ) {
    await this.get(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...body,
        email: body.email?.toLowerCase(),
        lastActivityAt: new Date(),
      },
      include: { contacts: true },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.customer.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async listContacts(customerId: string) {
    await this.get(customerId);
    return this.prisma.contact.findMany({
      where: { customerId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async addContact(
    customerId: string,
    body: {
      name: string;
      email?: string;
      phone?: string;
      title?: string;
      isPrimary?: boolean;
      notes?: string;
    },
  ) {
    await this.get(customerId);
    if (body.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.contact.create({
      data: {
        customerId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        title: body.title,
        isPrimary: body.isPrimary ?? false,
        notes: body.notes,
      },
    });
  }

  async updateContact(
    customerId: string,
    contactId: string,
    body: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      title?: string | null;
      isPrimary?: boolean;
      notes?: string | null;
    },
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, customerId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    if (body.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.contact.update({
      where: { id: contactId },
      data: body,
    });
  }

  async removeContact(customerId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, customerId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.contact.delete({ where: { id: contactId } });
  }
}
