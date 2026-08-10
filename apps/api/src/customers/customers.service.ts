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
        _count: {
          select: { projects: true, contacts: true, quotations: true },
        },
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
          include: {
            testingOrders: true,
            commercialOwner: { select: { id: true, name: true } },
          },
        },
        opportunities: true,
        quotations: {
          orderBy: { updatedAt: 'desc' },
          include: {
            lineItems: true,
            events: { orderBy: { createdAt: 'asc' } },
            createdBy: { select: { id: true, name: true } },
          },
        },
        invoices: true,
        documents: true,
        documentRequests: {
          orderBy: { createdAt: 'desc' },
          include: { items: true, serviceOffering: true },
        },
        testRequestForms: { orderBy: { createdAt: 'desc' } },
        workLibrary: {
          orderBy: { happenedAt: 'desc' },
          take: 30,
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  /** Customer journey: shared → revised → testing opted */
  async journey(id: string) {
    await this.get(id);
    const quotations = await this.prisma.quotation.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        lineItems: { where: { kind: 'TESTING' } },
        createdBy: { select: { name: true } },
      },
    });

    const timeline = quotations.flatMap((q) => {
      const createdEvent = q.events.find((e) => e.event === 'CREATED');
      const steps = [
        {
          at: createdEvent?.createdAt || q.createdAt,
          type: 'QUOTE_CREATED',
          quoteNumber: q.quoteNumber,
          quotationId: q.id,
          detail: q.serviceName,
        },
      ];
      if (q.sharedAt) {
        steps.push({
          at: q.sharedAt,
          type: 'QUOTE_SHARED',
          quoteNumber: q.quoteNumber,
          quotationId: q.id,
          detail: 'Shared with customer',
        });
      }
      for (const ev of q.events.filter((e) =>
        ['REVISION_REQUESTED', 'REVISED'].includes(e.event),
      )) {
        steps.push({
          at: ev.createdAt,
          type: ev.event,
          quoteNumber: q.quoteNumber,
          quotationId: q.id,
          detail: ev.note || ev.event,
        });
      }
      if (q.testingOptedAt) {
        steps.push({
          at: q.testingOptedAt,
          type: 'TESTING_OPTED',
          quoteNumber: q.quoteNumber,
          quotationId: q.id,
          detail:
            q.lineItems.map((l) => l.title).join(', ') ||
            'Testing services selected',
        });
      }
      if (q.acceptedAt) {
        steps.push({
          at: q.acceptedAt,
          type: 'QUOTE_ACCEPTED',
          quoteNumber: q.quoteNumber,
          quotationId: q.id,
          detail: 'Accepted',
        });
      }
      return steps;
    });

    timeline.sort((a, b) => {
      const dt = a.at.getTime() - b.at.getTime();
      if (dt !== 0) return dt;
      const order = [
        'QUOTE_CREATED',
        'QUOTE_SHARED',
        'REVISION_REQUESTED',
        'REVISED',
        'TESTING_OPTED',
        'QUOTE_ACCEPTED',
      ];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });

    return {
      customerId: id,
      quotations: quotations.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        serviceName: q.serviceName,
        sharedAt: q.sharedAt,
        revisionCount: q.revisionCount,
        testingOptedAt: q.testingOptedAt,
        acceptedAt: q.acceptedAt,
        testingLines: q.lineItems,
        owner: q.createdBy?.name,
      })),
      timeline,
    };
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
