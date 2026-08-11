import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SamplesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: { status?: string; projectId?: string }) {
    const where: Prisma.SampleShipmentWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    return this.prisma.sampleShipment.findMany({
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

  async get(id: string) {
    const sample = await this.prisma.sampleShipment.findUnique({
      where: { id },
      include: { partnerLab: true, project: true },
    });
    if (!sample) throw new NotFoundException('Sample shipment not found');
    return sample;
  }

  create(body: {
    projectId: string;
    trackingNumber?: string;
    carrier?: string;
    status?: string;
    partnerLabId?: string;
    dispatchedAt?: string;
    receivedAt?: string;
    notes?: string;
  }) {
    return this.prisma.sampleShipment.create({
      data: {
        projectId: body.projectId,
        trackingNumber: body.trackingNumber,
        carrier: body.carrier,
        status: body.status,
        partnerLabId: body.partnerLabId,
        dispatchedAt: body.dispatchedAt
          ? new Date(body.dispatchedAt)
          : undefined,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
        notes: body.notes,
      },
      include: { partnerLab: true },
    });
  }

  async update(
    id: string,
    body: {
      trackingNumber?: string | null;
      carrier?: string | null;
      status?: string;
      partnerLabId?: string | null;
      dispatchedAt?: string | null;
      receivedAt?: string | null;
      notes?: string | null;
    },
  ) {
    await this.get(id);
    return this.prisma.sampleShipment.update({
      where: { id },
      data: {
        trackingNumber: body.trackingNumber,
        carrier: body.carrier,
        status: body.status,
        partnerLabId: body.partnerLabId,
        dispatchedAt:
          body.dispatchedAt === undefined
            ? undefined
            : body.dispatchedAt
              ? new Date(body.dispatchedAt)
              : null,
        receivedAt:
          body.receivedAt === undefined
            ? undefined
            : body.receivedAt
              ? new Date(body.receivedAt)
              : null,
        notes: body.notes,
      },
      include: { partnerLab: true },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.sampleShipment.delete({ where: { id } });
  }
}
