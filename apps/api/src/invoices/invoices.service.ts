import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { invoiceNumber: { startsWith: `INV-${year}-` } },
    });
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  list(query: { status?: string; customerId?: string; projectId?: string }) {
    const where: Prisma.InvoiceWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.projectId) where.projectId = query.projectId;
    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        project: {
          select: { id: true, projectNumber: true, title: true },
        },
        payments: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async get(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        quotation: true,
        payments: { orderBy: { receivedAt: 'desc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(
    body: {
      customerId: string;
      projectId?: string;
      quotationId?: string;
      status?: string;
      currency?: string;
      subtotal?: number;
      taxAmount?: number;
      total?: number;
      dueDate?: string;
      notes?: string;
    },
    createdById?: string,
  ) {
    const subtotal = body.subtotal ?? 0;
    const taxAmount = body.taxAmount ?? 0;
    const total = body.total ?? subtotal + taxAmount;
    return this.prisma.invoice.create({
      data: {
        invoiceNumber: await this.nextInvoiceNumber(),
        customerId: body.customerId,
        projectId: body.projectId,
        quotationId: body.quotationId,
        status: body.status,
        currency: body.currency,
        subtotal,
        taxAmount,
        total,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
        createdById,
      },
      include: { payments: true, customer: true },
    });
  }

  async update(
    id: string,
    body: {
      status?: string;
      subtotal?: number;
      taxAmount?: number;
      total?: number;
      dueDate?: string | null;
      issuedAt?: string | null;
      notes?: string | null;
    },
  ) {
    await this.get(id);
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: body.status,
        subtotal: body.subtotal,
        taxAmount: body.taxAmount,
        total: body.total,
        dueDate:
          body.dueDate === undefined
            ? undefined
            : body.dueDate
              ? new Date(body.dueDate)
              : null,
        issuedAt:
          body.issuedAt === undefined
            ? undefined
            : body.issuedAt
              ? new Date(body.issuedAt)
              : null,
        notes: body.notes,
      },
      include: { payments: true },
    });
  }

  async addPayment(
    invoiceId: string,
    body: {
      amount: number;
      method?: string;
      reference?: string;
      receivedAt?: string;
      notes?: string;
    },
  ) {
    const invoice = await this.get(invoiceId);
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount: body.amount,
        method: body.method,
        reference: body.reference,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
        notes: body.notes,
      },
    });
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + body.amount;
    const status =
      paid >= invoice.total ? 'PAID' : paid > 0 ? 'PARTIAL' : invoice.status;
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });
    if (invoice.projectId) {
      await this.prisma.project.update({
        where: { id: invoice.projectId },
        data: {
          paymentStatus:
            status === 'PAID'
              ? 'PAID'
              : status === 'PARTIAL'
                ? 'PARTIAL'
                : 'PENDING',
          lastActivityAt: new Date(),
        },
      });
    }
    return payment;
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.invoice.delete({ where: { id } });
  }
}
