import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: { status?: string; assignedToId?: string; search?: string }) {
    const where: Prisma.LeadWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.search) {
      where.OR = [
        { company: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        leadSource: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        customer: true,
      },
    });
  }

  async get(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        leadSource: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        customer: true,
        opportunities: true,
        quotations: true,
        projects: true,
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createFromBody(
    body: {
      customerName: string;
      company: string;
      companySize?: string;
      email: string;
      phone: string;
      country: string;
      state?: string;
      product?: string;
      serviceName?: string;
      expectedValue?: number;
      expectedClose?: string;
      status?: string;
      followUpAt?: string;
      notes?: string;
      leadSourceId: string;
      assignedToId?: string;
      customerId?: string;
    },
    createdById: string,
  ) {
    return this.prisma.lead.create({
      data: {
        customerName: body.customerName,
        company: body.company,
        companySize: body.companySize,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        product: body.product,
        serviceName: body.serviceName,
        expectedValue: body.expectedValue ?? 0,
        expectedClose: body.expectedClose
          ? new Date(body.expectedClose)
          : undefined,
        status: body.status,
        followUpAt: body.followUpAt ? new Date(body.followUpAt) : undefined,
        notes: body.notes,
        leadSource: { connect: { id: body.leadSourceId } },
        createdBy: { connect: { id: createdById } },
        assignedTo: body.assignedToId
          ? { connect: { id: body.assignedToId } }
          : undefined,
        customer: body.customerId
          ? { connect: { id: body.customerId } }
          : undefined,
      },
      include: {
        leadSource: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(
    id: string,
    body: {
      customerName?: string;
      company?: string;
      companySize?: string;
      email?: string;
      phone?: string;
      country?: string;
      state?: string | null;
      product?: string | null;
      serviceName?: string | null;
      expectedValue?: number;
      expectedClose?: string | null;
      status?: string;
      followUpAt?: string | null;
      notes?: string | null;
      assignedToId?: string | null;
      customerId?: string | null;
      leadSourceId?: string;
    },
  ) {
    await this.get(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        customerName: body.customerName,
        company: body.company,
        companySize: body.companySize,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        product: body.product,
        serviceName: body.serviceName,
        expectedValue: body.expectedValue,
        expectedClose:
          body.expectedClose === undefined
            ? undefined
            : body.expectedClose
              ? new Date(body.expectedClose)
              : null,
        status: body.status,
        followUpAt:
          body.followUpAt === undefined
            ? undefined
            : body.followUpAt
              ? new Date(body.followUpAt)
              : null,
        notes: body.notes,
        assignedTo:
          body.assignedToId === undefined
            ? undefined
            : body.assignedToId
              ? { connect: { id: body.assignedToId } }
              : { disconnect: true },
        customer:
          body.customerId === undefined
            ? undefined
            : body.customerId
              ? { connect: { id: body.customerId } }
              : { disconnect: true },
        leadSource: body.leadSourceId
          ? { connect: { id: body.leadSourceId } }
          : undefined,
      },
      include: {
        leadSource: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.lead.delete({ where: { id } });
  }

  listSources() {
    return this.prisma.leadSource.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }
}
