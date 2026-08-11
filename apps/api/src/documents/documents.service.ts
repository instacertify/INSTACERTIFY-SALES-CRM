import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: {
    projectId?: string;
    customerId?: string;
    category?: string;
    status?: string;
  }) {
    const where: Prisma.DocumentWhereInput = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        project: {
          select: { id: true, projectNumber: true, title: true },
        },
        customer: {
          select: { id: true, company: true, email: true },
        },
      },
    });
  }

  async get(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        project: true,
        customer: true,
      },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  create(
    body: {
      name: string;
      category?: string;
      originalName: string;
      storedName: string;
      mimeType?: string;
      size?: number;
      storageKey?: string;
      status?: string;
      notes?: string;
      projectId?: string;
      customerId?: string;
    },
    uploadedById?: string,
  ) {
    return this.prisma.document.create({
      data: {
        name: body.name,
        category: body.category,
        originalName: body.originalName,
        storedName: body.storedName,
        mimeType: body.mimeType,
        size: body.size ?? 0,
        storageKey: body.storageKey,
        status: body.status,
        notes: body.notes,
        projectId: body.projectId,
        customerId: body.customerId,
        uploadedById,
      },
    });
  }

  async update(
    id: string,
    body: {
      name?: string;
      category?: string;
      status?: string;
      notes?: string | null;
      storageKey?: string | null;
    },
  ) {
    await this.get(id);
    return this.prisma.document.update({
      where: { id },
      data: body,
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.document.delete({ where: { id } });
  }
}
