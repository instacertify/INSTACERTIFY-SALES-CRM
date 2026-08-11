import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  searchTesting(query: {
    q?: string;
    category?: string;
    labId?: string;
    active?: string;
  }) {
    const where: Prisma.TestingCatalogItemWhereInput = {};
    if (query.active !== 'false') where.active = true;
    if (query.category) where.category = query.category;
    if (query.labId) where.partnerLabId = query.labId;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { scope: { contains: query.q, mode: 'insensitive' } },
        { standardCode: { contains: query.q, mode: 'insensitive' } },
        { notes: { contains: query.q, mode: 'insensitive' } },
        {
          partnerLab: {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { scope: { contains: query.q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }
    return this.prisma.testingCatalogItem.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        partnerLab: {
          select: {
            id: true,
            name: true,
            scope: true,
            nabl: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  createTestingItem(body: {
    name: string;
    category?: string;
    scope?: string;
    standardCode?: string;
    purchasePrice?: number;
    salesPrice?: number;
    turnaroundDays?: number;
    partnerLabId?: string;
    notes?: string;
  }) {
    return this.prisma.testingCatalogItem.create({
      data: {
        name: body.name,
        category: body.category || 'GENERAL',
        scope: body.scope || '',
        standardCode: body.standardCode,
        purchasePrice: body.purchasePrice ?? 0,
        salesPrice: body.salesPrice ?? 0,
        turnaroundDays: body.turnaroundDays ?? 15,
        partnerLabId: body.partnerLabId,
        notes: body.notes,
      },
      include: { partnerLab: true },
    });
  }

  async updateTestingItem(
    id: string,
    body: Partial<{
      name: string;
      category: string;
      scope: string;
      standardCode: string | null;
      purchasePrice: number;
      salesPrice: number;
      turnaroundDays: number;
      partnerLabId: string | null;
      notes: string | null;
      active: boolean;
    }>,
  ) {
    const existing = await this.prisma.testingCatalogItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Catalog item not found');
    return this.prisma.testingCatalogItem.update({
      where: { id },
      data: body,
      include: { partnerLab: true },
    });
  }

  searchLabs(query: { q?: string; active?: string }) {
    const where: Prisma.PartnerLabWhereInput = {};
    if (query.active !== 'false') where.active = true;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { scope: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
        { accreditation: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.partnerLab.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { catalogItems: true } },
      },
    });
  }

  upsertLab(body: {
    id?: string;
    name: string;
    scope?: string;
    country?: string;
    city?: string;
    email?: string;
    phone?: string;
    nabl?: boolean;
    accreditation?: string;
    notes?: string;
    active?: boolean;
  }) {
    if (body.id) {
      return this.prisma.partnerLab.update({
        where: { id: body.id },
        data: {
          name: body.name,
          scope: body.scope,
          country: body.country,
          city: body.city,
          email: body.email,
          phone: body.phone,
          nabl: body.nabl,
          accreditation: body.accreditation,
          notes: body.notes,
          active: body.active,
        },
      });
    }
    return this.prisma.partnerLab.create({
      data: {
        name: body.name,
        scope: body.scope || '',
        country: body.country,
        city: body.city,
        email: body.email,
        phone: body.phone,
        nabl: body.nabl ?? false,
        accreditation: body.accreditation,
        notes: body.notes,
      },
    });
  }

  listServices() {
    return this.prisma.serviceOffering.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        checklistItems: { orderBy: { sequence: 'asc' } },
      },
    });
  }

  createService(body: {
    name: string;
    serviceType?: string;
    description?: string;
    checklist?: Array<{ name: string; description?: string; required?: boolean }>;
  }) {
    return this.prisma.serviceOffering.create({
      data: {
        name: body.name,
        serviceType: body.serviceType || 'CONSULTING',
        description: body.description,
        checklistItems: body.checklist?.length
          ? {
              create: body.checklist.map((c, i) => ({
                name: c.name,
                description: c.description,
                required: c.required ?? true,
                sequence: (i + 1) * 10,
              })),
            }
          : undefined,
      },
      include: { checklistItems: true },
    });
  }
}
