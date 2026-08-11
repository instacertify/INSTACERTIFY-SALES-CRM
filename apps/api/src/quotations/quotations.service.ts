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
        lineItems: true,
        _count: { select: { events: true } },
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
        lineItems: {
          include: {
            catalogItem: {
              include: { partnerLab: { select: { id: true, name: true } } },
            },
          },
        },
        events: { orderBy: { createdAt: 'asc' } },
        documentRequests: { select: { id: true, status: true, publicToken: true } },
        testRequestForms: { select: { id: true, status: true, publicToken: true } },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  private async addEvent(
    quotationId: string,
    event: string,
    note?: string,
    meta?: Record<string, unknown>,
  ) {
    return this.prisma.quotationEvent.create({
      data: {
        quotationId,
        event,
        note,
        metaJson: JSON.stringify(meta || {}),
      },
    });
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
    }).then(async (quote) => {
      await this.addEvent(quote.id, 'CREATED', 'Quotation created');
      return quote;
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
    const existing = await this.get(id);
    const updated = await this.prisma.quotation.update({
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
        sharedAt:
          body.status === 'SHARED' ? new Date() : undefined,
        acceptedAt:
          body.status === 'ACCEPTED' ? new Date() : undefined,
        revisionCount:
          body.status === 'REVISION_REQUESTED'
            ? existing.revisionCount + 1
            : undefined,
      },
    });
    if (body.status && body.status !== existing.status) {
      await this.addEvent(
        id,
        body.status,
        body.revisionMessage || `Status → ${body.status}`,
      );
    }
    return updated;
  }

  async share(id: string) {
    await this.get(id);
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status: 'SHARED', sharedAt: new Date() },
    });
    await this.addEvent(id, 'SHARED', 'Quote shared with customer');
    return updated;
  }

  async requestRevision(id: string, message: string) {
    await this.get(id);
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'REVISION_REQUESTED',
        revisionMessage: message,
        revisionCount: { increment: 1 },
      },
    });
    await this.addEvent(id, 'REVISION_REQUESTED', message);
    return updated;
  }

  async markRevised(id: string, note?: string) {
    await this.get(id);
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status: 'SHARED', revisionMessage: null },
    });
    await this.addEvent(id, 'REVISED', note || 'Revised quote re-shared');
    return updated;
  }

  async optTesting(id: string, note?: string) {
    await this.get(id);
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { testingOptedAt: new Date() },
    });
    await this.addEvent(id, 'TESTING_OPTED', note || 'Customer opted testing services');
    return updated;
  }

  /**
   * Accept quote → mark ACCEPTED, ensure Customer, create Project + TestingOrders,
   * optionally draft Invoice.
   */
  async accept(
    id: string,
    createdById: string,
    opts?: { createInvoice?: boolean; note?: string },
  ) {
    const quote = await this.get(id);
    if (quote.status === 'ACCEPTED' && quote.projects.length) {
      return {
        quotation: quote,
        project: quote.projects[0],
        invoice: quote.invoices[0] || null,
      };
    }

    let customerId = quote.customerId;
    if (!customerId) {
      const existing = await this.prisma.customer.findUnique({
        where: { email: quote.email },
      });
      const customer =
        existing ||
        (await this.prisma.customer.create({
          data: {
            company: quote.company,
            email: quote.email,
            phone: quote.phone,
            country: quote.country,
            state: quote.state,
          },
        }));
      customerId = customer.id;
    }

    const projectValue =
      quote.consultingPrice +
      quote.testingPrice +
      quote.otherCommercials +
      quote.governmentFees;

    const year = new Date().getFullYear();
    const pCount = await this.prisma.project.count({
      where: { projectNumber: { startsWith: `IC-${year}-` } },
    });
    const projectNumber = `IC-${year}-${String(pCount + 1).padStart(5, '0')}`;

    const project = await this.prisma.project.create({
      data: {
        projectNumber,
        title: `${quote.serviceName} — ${quote.company}`,
        status: 'ACCEPTED',
        serviceName: quote.serviceName,
        projectValue,
        consultingFees: quote.consultingPrice,
        governmentFees: quote.governmentFees,
        testingFees: quote.testingPrice,
        customerName: quote.customerName,
        company: quote.company,
        email: quote.email,
        phone: quote.phone,
        country: quote.country,
        state: quote.state,
        scopeSummary: quote.description,
        customerId,
        leadId: quote.leadId,
        quotationId: quote.id,
        commercialOwnerId: quote.createdById,
        deliveryOwnerId: createdById,
        startDate: new Date(),
      },
    });

    const testingLines = quote.lineItems.filter((l) => l.kind === 'TESTING');
    for (const line of testingLines) {
      await this.prisma.testingOrder.create({
        data: {
          projectId: project.id,
          testName: line.title,
          status: 'PLANNED',
          purchasePrice: line.purchasePrice,
          salesPrice: line.unitPrice,
          catalogItemId: line.catalogItemId,
          partnerLabId: line.catalogItem?.partnerLabId,
          notes: line.description || undefined,
        },
      });
    }

    let invoice = null as Awaited<
      ReturnType<typeof this.prisma.invoice.create>
    > | null;
    if (opts?.createInvoice !== false && projectValue > 0) {
      const iCount = await this.prisma.invoice.count({
        where: { invoiceNumber: { startsWith: `INV-${year}-` } },
      });
      const invoiceNumber = `INV-${year}-${String(iCount + 1).padStart(5, '0')}`;
      const taxAmount = Math.round(projectValue * 0.18);
      invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          status: 'DRAFT',
          subtotal: projectValue,
          taxAmount,
          total: projectValue + taxAmount,
          customerId,
          projectId: project.id,
          quotationId: quote.id,
          createdById,
          notes: `Auto-created from ${quote.quoteNumber}`,
        },
      });
    }

    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        customerId,
      },
      include: {
        customer: true,
        projects: true,
        invoices: true,
        lineItems: true,
      },
    });
    await this.addEvent(
      id,
      'ACCEPTED',
      opts?.note || `Accepted → project ${project.projectNumber}`,
      { projectId: project.id, invoiceId: invoice?.id },
    );

    if (quote.leadId) {
      await this.prisma.lead.update({
        where: { id: quote.leadId },
        data: { status: 'WON', customerId },
      });
    }
    if (quote.opportunityId) {
      await this.prisma.opportunity.update({
        where: { id: quote.opportunityId },
        data: { stage: 'WON', amount: projectValue },
      });
    }
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        lifetimeValue: { increment: projectValue },
        lastActivityAt: new Date(),
      },
    });

    return { quotation, project, invoice };
  }

  async addLineItem(
    id: string,
    body: {
      kind?: string;
      title: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      purchasePrice?: number;
      catalogItemId?: string;
    },
  ) {
    await this.get(id);
    let unitPrice = body.unitPrice ?? 0;
    let purchasePrice = body.purchasePrice ?? 0;
    let title = body.title;
    let kind = body.kind || 'CONSULTING';

    if (body.catalogItemId) {
      const catalog = await this.prisma.testingCatalogItem.findUnique({
        where: { id: body.catalogItemId },
      });
      if (catalog) {
        unitPrice = body.unitPrice ?? catalog.salesPrice;
        purchasePrice = body.purchasePrice ?? catalog.purchasePrice;
        title = body.title || catalog.name;
        kind = 'TESTING';
      }
    }

    const quantity = body.quantity ?? 1;
    const amount = unitPrice * quantity;
    const item = await this.prisma.quotationLineItem.create({
      data: {
        quotationId: id,
        kind,
        title,
        description: body.description,
        quantity,
        unitPrice,
        purchasePrice,
        amount,
        catalogItemId: body.catalogItemId,
      },
      include: { catalogItem: true },
    });

    // Roll up testing/consulting totals on quote header
    const lines = await this.prisma.quotationLineItem.findMany({
      where: { quotationId: id },
    });
    const testingPrice = lines
      .filter((l) => l.kind === 'TESTING')
      .reduce((s, l) => s + l.amount, 0);
    const consultingPrice = lines
      .filter((l) => l.kind === 'CONSULTING')
      .reduce((s, l) => s + l.amount, 0);
    await this.prisma.quotation.update({
      where: { id },
      data: { testingPrice, consultingPrice },
    });

    return item;
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.quotation.delete({ where: { id } });
  }
}
