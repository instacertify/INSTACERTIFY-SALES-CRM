import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.opportunity.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { id: true, company: true } },
        owner: { select: { id: true, name: true } },
        lead: { select: { id: true, customerName: true } },
      },
    });
  }

  async get(id: string) {
    const row = await this.prisma.opportunity.findUnique({
      where: { id },
      include: { customer: true, owner: true, lead: true, quotations: true },
    });
    if (!row) throw new NotFoundException('Opportunity not found');
    return row;
  }

  create(
    body: {
      title: string;
      customerId: string;
      leadId?: string;
      ownerId?: string;
      stage?: string;
      amount?: number;
      probability?: number;
      expectedClose?: string;
      serviceName?: string;
      notes?: string;
    },
    actorId: string,
  ) {
    return this.prisma.opportunity.create({
      data: {
        title: body.title,
        customerId: body.customerId,
        leadId: body.leadId,
        ownerId: body.ownerId || actorId,
        stage: body.stage || 'DISCOVERY',
        amount: body.amount ?? 0,
        probability: body.probability ?? 20,
        expectedClose: body.expectedClose
          ? new Date(body.expectedClose)
          : undefined,
        serviceName: body.serviceName,
        notes: body.notes,
      },
    });
  }

  async update(
    id: string,
    body: Partial<{
      title: string;
      stage: string;
      amount: number;
      probability: number;
      expectedClose: string | null;
      serviceName: string | null;
      notes: string | null;
      ownerId: string | null;
    }>,
  ) {
    await this.get(id);
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        title: body.title,
        stage: body.stage,
        amount: body.amount,
        probability: body.probability,
        expectedClose:
          body.expectedClose === undefined
            ? undefined
            : body.expectedClose
              ? new Date(body.expectedClose)
              : null,
        serviceName: body.serviceName,
        notes: body.notes,
        ownerId: body.ownerId,
      },
    });
  }
}
