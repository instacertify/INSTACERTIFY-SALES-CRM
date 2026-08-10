import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificationService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: { status?: string; projectId?: string }) {
    const where: Prisma.CertificationRecordWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    return this.prisma.certificationRecord.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
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
    const record = await this.prisma.certificationRecord.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!record) throw new NotFoundException('Certification record not found');
    return record;
  }

  create(body: {
    projectId: string;
    certificateNo?: string;
    authority?: string;
    status?: string;
    issuedAt?: string;
    expiresAt?: string;
    renewalDate?: string;
    notes?: string;
  }) {
    return this.prisma.certificationRecord.create({
      data: {
        projectId: body.projectId,
        certificateNo: body.certificateNo,
        authority: body.authority,
        status: body.status,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        renewalDate: body.renewalDate
          ? new Date(body.renewalDate)
          : undefined,
        notes: body.notes,
      },
    });
  }

  async update(
    id: string,
    body: {
      certificateNo?: string | null;
      authority?: string | null;
      status?: string;
      issuedAt?: string | null;
      expiresAt?: string | null;
      renewalDate?: string | null;
      notes?: string | null;
    },
  ) {
    await this.get(id);
    return this.prisma.certificationRecord.update({
      where: { id },
      data: {
        certificateNo: body.certificateNo,
        authority: body.authority,
        status: body.status,
        issuedAt:
          body.issuedAt === undefined
            ? undefined
            : body.issuedAt
              ? new Date(body.issuedAt)
              : null,
        expiresAt:
          body.expiresAt === undefined
            ? undefined
            : body.expiresAt
              ? new Date(body.expiresAt)
              : null,
        renewalDate:
          body.renewalDate === undefined
            ? undefined
            : body.renewalDate
              ? new Date(body.renewalDate)
              : null,
        notes: body.notes,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.certificationRecord.delete({ where: { id } });
  }
}
