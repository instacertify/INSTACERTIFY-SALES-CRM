import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestingService {
  constructor(private readonly prisma: PrismaService) {}

  listOrders(query: { status?: string; projectId?: string }) {
    const where: Prisma.TestingOrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    return this.prisma.testingOrder.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        partnerLab: true,
        project: {
          select: {
            id: true,
            projectNumber: true,
            title: true,
            company: true,
          },
        },
      },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.testingOrder.findUnique({
      where: { id },
      include: { partnerLab: true, project: true },
    });
    if (!order) throw new NotFoundException('Testing order not found');
    return order;
  }

  createOrder(body: {
    projectId: string;
    testName: string;
    status?: string;
    purchasePrice?: number;
    salesPrice?: number;
    partnerLabId?: string;
    notes?: string;
  }) {
    return this.prisma.testingOrder.create({
      data: {
        projectId: body.projectId,
        testName: body.testName,
        status: body.status,
        purchasePrice: body.purchasePrice ?? 0,
        salesPrice: body.salesPrice ?? 0,
        partnerLabId: body.partnerLabId,
        notes: body.notes,
      },
      include: { partnerLab: true },
    });
  }

  async updateOrder(
    id: string,
    body: {
      testName?: string;
      status?: string;
      purchasePrice?: number;
      salesPrice?: number;
      partnerLabId?: string | null;
      reportRef?: string | null;
      notes?: string | null;
      startedAt?: string | null;
      completedAt?: string | null;
    },
  ) {
    await this.getOrder(id);
    return this.prisma.testingOrder.update({
      where: { id },
      data: {
        testName: body.testName,
        status: body.status,
        purchasePrice: body.purchasePrice,
        salesPrice: body.salesPrice,
        partnerLabId: body.partnerLabId,
        reportRef: body.reportRef,
        notes: body.notes,
        startedAt:
          body.startedAt === undefined
            ? undefined
            : body.startedAt
              ? new Date(body.startedAt)
              : null,
        completedAt:
          body.completedAt === undefined
            ? undefined
            : body.completedAt
              ? new Date(body.completedAt)
              : null,
      },
      include: { partnerLab: true },
    });
  }

  async removeOrder(id: string) {
    await this.getOrder(id);
    return this.prisma.testingOrder.delete({ where: { id } });
  }

  listLabs(query: { active?: string }) {
    const where: Prisma.PartnerLabWhereInput = {};
    if (query.active !== undefined) {
      where.active = query.active === 'true';
    }
    return this.prisma.partnerLab.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getLab(id: string) {
    const lab = await this.prisma.partnerLab.findUnique({
      where: { id },
      include: {
        testingOrders: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lab) throw new NotFoundException('Partner lab not found');
    return lab;
  }

  createLab(body: {
    name: string;
    country?: string;
    email?: string;
    phone?: string;
    nabl?: boolean;
    active?: boolean;
    notes?: string;
  }) {
    return this.prisma.partnerLab.create({ data: body });
  }

  async updateLab(
    id: string,
    body: {
      name?: string;
      country?: string | null;
      email?: string | null;
      phone?: string | null;
      nabl?: boolean;
      active?: boolean;
      notes?: string | null;
    },
  ) {
    await this.getLab(id);
    return this.prisma.partnerLab.update({ where: { id }, data: body });
  }
}
