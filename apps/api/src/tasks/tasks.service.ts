import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: {
    status?: string;
    assignedToId?: string;
    projectId?: string;
  }) {
    const where: Prisma.ProjectTaskWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.projectId) where.projectId = query.projectId;
    return this.prisma.projectTask.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            title: true,
            status: true,
            company: true,
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async get(id: string) {
    const task = await this.prisma.projectTask.findUnique({
      where: { id },
      include: {
        project: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  create(body: {
    projectId: string;
    title: string;
    status?: string;
    waitingFor?: string;
    waitingExpectedOn?: string;
    waitingNote?: string;
    dueDate?: string;
    sequence?: number;
    notes?: string;
    assignedToId?: string;
  }) {
    return this.prisma.projectTask.create({
      data: {
        projectId: body.projectId,
        title: body.title,
        status: body.status,
        waitingFor: body.waitingFor,
        waitingExpectedOn: body.waitingExpectedOn
          ? new Date(body.waitingExpectedOn)
          : undefined,
        waitingNote: body.waitingNote,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        sequence: body.sequence ?? 10,
        notes: body.notes,
        assignedToId: body.assignedToId,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(
    id: string,
    body: {
      title?: string;
      status?: string;
      waitingFor?: string | null;
      waitingExpectedOn?: string | null;
      waitingNote?: string | null;
      dueDate?: string | null;
      sequence?: number;
      notes?: string | null;
      assignedToId?: string | null;
    },
  ) {
    await this.get(id);
    const completed =
      body.status === 'COMPLETED' ? { completedAt: new Date() } : {};
    return this.prisma.projectTask.update({
      where: { id },
      data: {
        title: body.title,
        status: body.status,
        waitingFor: body.waitingFor,
        waitingExpectedOn:
          body.waitingExpectedOn === undefined
            ? undefined
            : body.waitingExpectedOn
              ? new Date(body.waitingExpectedOn)
              : null,
        waitingNote: body.waitingNote,
        dueDate:
          body.dueDate === undefined
            ? undefined
            : body.dueDate
              ? new Date(body.dueDate)
              : null,
        sequence: body.sequence,
        notes: body.notes,
        assignedToId: body.assignedToId,
        ...completed,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.projectTask.delete({ where: { id } });
  }
}
