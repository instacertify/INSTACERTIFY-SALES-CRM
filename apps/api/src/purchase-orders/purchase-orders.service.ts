import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextPoNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: { poNumber: { startsWith: `PO-${year}-` } },
    });
    return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  list(query: { status?: string; vendorId?: string; projectId?: string }) {
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.projectId) where.projectId = query.projectId;
    return this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, name: true, type: true } },
        partnerLab: { select: { id: true, name: true } },
        project: { select: { id: true, projectNumber: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async get(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        partnerLab: true,
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(
    body: {
      description: string;
      amount?: number;
      taxAmount?: number;
      total?: number;
      currency?: string;
      status?: string;
      dueDate?: string;
      notes?: string;
      vendorId?: string;
      partnerLabId?: string;
      projectId?: string;
    },
    createdById?: string,
  ) {
    const amount = body.amount ?? 0;
    const taxAmount = body.taxAmount ?? 0;
    const total = body.total ?? amount + taxAmount;
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber: await this.nextPoNumber(),
        description: body.description,
        amount,
        taxAmount,
        total,
        currency: body.currency,
        status: body.status,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
        vendorId: body.vendorId,
        partnerLabId: body.partnerLabId,
        projectId: body.projectId,
        createdById,
      },
      include: {
        vendor: true,
        partnerLab: true,
        project: true,
      },
    });
  }

  async update(
    id: string,
    body: Partial<{
      description: string;
      amount: number;
      taxAmount: number;
      total: number;
      status: string;
      dueDate: string | null;
      billedAt: string | null;
      notes: string | null;
      vendorId: string | null;
      partnerLabId: string | null;
      projectId: string | null;
    }>,
  ) {
    await this.get(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        description: body.description,
        amount: body.amount,
        taxAmount: body.taxAmount,
        total: body.total,
        status: body.status,
        dueDate:
          body.dueDate === undefined
            ? undefined
            : body.dueDate
              ? new Date(body.dueDate)
              : null,
        billedAt:
          body.billedAt === undefined
            ? undefined
            : body.billedAt
              ? new Date(body.billedAt)
              : null,
        notes: body.notes,
        vendorId: body.vendorId,
        partnerLabId: body.partnerLabId,
        projectId: body.projectId,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
