import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: {
    status?: string;
    category?: string;
    projectId?: string;
    customerId?: string;
  }) {
    const where: Prisma.ExpenseWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.projectId) where.projectId = query.projectId;
    if (query.customerId) where.customerId = query.customerId;
    return this.prisma.expense.findMany({
      where,
      orderBy: { spentAt: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        customer: { select: { id: true, company: true } },
        project: { select: { id: true, projectNumber: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async get(id: string) {
    const row = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        vendor: true,
        customer: true,
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!row) throw new NotFoundException('Expense not found');
    return row;
  }

  create(
    body: {
      title: string;
      category?: string;
      amount?: number;
      currency?: string;
      status?: string;
      spentAt?: string;
      reference?: string;
      notes?: string;
      vendorId?: string;
      customerId?: string;
      projectId?: string;
    },
    createdById?: string,
  ) {
    return this.prisma.expense.create({
      data: {
        title: body.title,
        category: body.category,
        amount: body.amount ?? 0,
        currency: body.currency,
        status: body.status,
        spentAt: body.spentAt ? new Date(body.spentAt) : undefined,
        reference: body.reference,
        notes: body.notes,
        vendorId: body.vendorId,
        customerId: body.customerId,
        projectId: body.projectId,
        createdById,
      },
    });
  }

  async update(
    id: string,
    body: Partial<{
      title: string;
      category: string;
      amount: number;
      status: string;
      spentAt: string;
      reference: string | null;
      notes: string | null;
      vendorId: string | null;
      customerId: string | null;
      projectId: string | null;
    }>,
  ) {
    await this.get(id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        title: body.title,
        category: body.category,
        amount: body.amount,
        status: body.status,
        spentAt: body.spentAt ? new Date(body.spentAt) : undefined,
        reference: body.reference,
        notes: body.notes,
        vendorId: body.vendorId,
        customerId: body.customerId,
        projectId: body.projectId,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.expense.delete({ where: { id } });
  }
}
