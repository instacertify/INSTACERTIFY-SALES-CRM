import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextQuoteNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.quotation.count({
      where: {
        quoteNumber: { startsWith: `Q-${year}-` },
      },
    });
    return `Q-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  list(query: { status?: string; customerId?: string }) {
    const where: Prisma.QuotationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    return this.prisma.quotation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: true,
      },
    });
  }

  async get(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lead: true,
        opportunity: true,
        createdBy: { select: { id: true, name: true, email: true } },
        projects: true,
        invoices: true,
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async create(
    body: {
      customerName: string;
      company: string;
      email: string;
      phone: string;
      country: string;
      state?: string;
      serviceName: string;
      description: string;
      validityDate: string;
      consultingPrice?: number;
      testingPrice?: number;
      otherCommercials?: number;
      otherCommercialsNote?: string;
      governmentFees?: number;
      bodyHtml?: string;
      bankSnapshot?: string;
      leadId?: string;
      customerId?: string;
      opportunityId?: string;
    },
    createdById: string,
  ) {
    return this.prisma.quotation.create({
      data: {
        quoteNumber: await this.nextQuoteNumber(),
        publicToken: randomBytes(16).toString('hex'),
        customerName: body.customerName,
        company: body.company,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        serviceName: body.serviceName,
        description: body.description,
        validityDate: new Date(body.validityDate),
        consultingPrice: body.consultingPrice ?? 0,
        testingPrice: body.testingPrice ?? 0,
        otherCommercials: body.otherCommercials ?? 0,
        otherCommercialsNote: body.otherCommercialsNote,
        governmentFees: body.governmentFees ?? 0,
        bodyHtml: body.bodyHtml ?? '',
        bankSnapshot: body.bankSnapshot ?? '',
        createdBy: { connect: { id: createdById } },
        lead: body.leadId ? { connect: { id: body.leadId } } : undefined,
        customer: body.customerId
          ? { connect: { id: body.customerId } }
          : undefined,
        opportunity: body.opportunityId
          ? { connect: { id: body.opportunityId } }
          : undefined,
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(
    id: string,
    body: {
      status?: string;
      customerName?: string;
      company?: string;
      email?: string;
      phone?: string;
      country?: string;
      state?: string | null;
      serviceName?: string;
      description?: string;
      validityDate?: string;
      consultingPrice?: number;
      testingPrice?: number;
      otherCommercials?: number;
      otherCommercialsNote?: string | null;
      governmentFees?: number;
      bodyHtml?: string;
      bankSnapshot?: string;
      customerRemark?: string | null;
      revisionMessage?: string | null;
    },
  ) {
    await this.get(id);
    return this.prisma.quotation.update({
      where: { id },
      data: {
        status: body.status,
        customerName: body.customerName,
        company: body.company,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        serviceName: body.serviceName,
        description: body.description,
        validityDate: body.validityDate
          ? new Date(body.validityDate)
          : undefined,
        consultingPrice: body.consultingPrice,
        testingPrice: body.testingPrice,
        otherCommercials: body.otherCommercials,
        otherCommercialsNote: body.otherCommercialsNote,
        governmentFees: body.governmentFees,
        bodyHtml: body.bodyHtml,
        bankSnapshot: body.bankSnapshot,
        customerRemark: body.customerRemark,
        revisionMessage: body.revisionMessage,
        sharedAt: body.status === 'SHARED' ? new Date() : undefined,
        acceptedAt: body.status === 'ACCEPTED' ? new Date() : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.quotation.delete({ where: { id } });
  }
}
