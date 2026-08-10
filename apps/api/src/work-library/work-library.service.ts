import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: {
    customerId?: string;
    projectId?: string;
    category?: string;
    q?: string;
  }) {
    const where: Prisma.WorkLibraryEntryWhereInput = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
        { tags: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.workLibraryEntry.findMany({
      where,
      orderBy: { happenedAt: 'desc' },
      include: {
        customer: { select: { id: true, company: true } },
        project: { select: { id: true, projectNumber: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  create(
    body: {
      customerId: string;
      projectId?: string;
      title: string;
      category?: string;
      summary: string;
      status?: string;
      effortHours?: number;
      valueAmount?: number;
      happenedAt?: string;
      linkUrl?: string;
      tags?: string;
    },
    createdById: string,
  ) {
    return this.prisma.workLibraryEntry.create({
      data: {
        customerId: body.customerId,
        projectId: body.projectId,
        title: body.title,
        category: body.category || 'GENERAL',
        summary: body.summary,
        status: body.status || 'DONE',
        effortHours: body.effortHours ?? 0,
        valueAmount: body.valueAmount ?? 0,
        happenedAt: body.happenedAt ? new Date(body.happenedAt) : new Date(),
        linkUrl: body.linkUrl,
        tags: body.tags || '',
        createdById,
      },
      include: {
        customer: { select: { id: true, company: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async update(
    id: string,
    body: Partial<{
      title: string;
      category: string;
      summary: string;
      status: string;
      effortHours: number;
      valueAmount: number;
      happenedAt: string;
      linkUrl: string | null;
      tags: string;
      projectId: string | null;
    }>,
  ) {
    const existing = await this.prisma.workLibraryEntry.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Work entry not found');
    return this.prisma.workLibraryEntry.update({
      where: { id },
      data: {
        title: body.title,
        category: body.category,
        summary: body.summary,
        status: body.status,
        effortHours: body.effortHours,
        valueAmount: body.valueAmount,
        happenedAt: body.happenedAt ? new Date(body.happenedAt) : undefined,
        linkUrl: body.linkUrl,
        tags: body.tags,
        projectId: body.projectId,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.workLibraryEntry.delete({ where: { id } });
    return { ok: true };
  }
}
