import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextProjectNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.project.count({
      where: { projectNumber: { startsWith: `IC-${year}-` } },
    });
    return `IC-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  list(query: {
    status?: string;
    ownerId?: string;
    waitingFor?: string;
    search?: string;
  }) {
    const where: Prisma.ProjectWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.waitingFor) where.waitingFor = query.waitingFor;
    if (query.ownerId) {
      where.OR = [
        { commercialOwnerId: query.ownerId },
        { deliveryOwnerId: query.ownerId },
      ];
    }
    if (query.search) {
      const searchFilter: Prisma.ProjectWhereInput[] = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { projectNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
      ];
      where.AND = [{ OR: searchFilter }];
    }
    return this.prisma.project.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
      include: {
        commercialOwner: {
          select: { id: true, name: true, email: true },
        },
        deliveryOwner: {
          select: { id: true, name: true, email: true },
        },
        customer: true,
        _count: {
          select: {
            tasks: true,
            documents: true,
            testingOrders: true,
            remarks: true,
          },
        },
      },
    });
  }

  async get(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        commercialOwner: {
          select: { id: true, name: true, email: true },
        },
        deliveryOwner: {
          select: { id: true, name: true, email: true },
        },
        customer: true,
        lead: true,
        quotation: true,
        products: true,
        manufacturers: true,
        applicants: true,
        standards: true,
        tasks: {
          orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        remarks: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        testingOrders: {
          include: { partnerLab: true },
          orderBy: { createdAt: 'desc' },
        },
        sampleShipments: {
          include: { partnerLab: true },
          orderBy: { createdAt: 'desc' },
        },
        certifications: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: true,
        authorityQueries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(body: {
    title: string;
    status?: string;
    serviceName?: string;
    serviceType?: string;
    projectValue?: number;
    consultingFees?: number;
    governmentFees?: number;
    testingFees?: number;
    customerName: string;
    company: string;
    email: string;
    phone?: string;
    country?: string;
    state?: string;
    scopeSummary?: string;
    waitingFor?: string;
    waitingNote?: string;
    waitingExpectedOn?: string;
    customerId?: string;
    leadId?: string;
    quotationId?: string;
    commercialOwnerId?: string;
    deliveryOwnerId?: string;
    startDate?: string;
    expectedCompletion?: string;
  }) {
    return this.prisma.project.create({
      data: {
        projectNumber: await this.nextProjectNumber(),
        title: body.title,
        status: body.status,
        serviceName: body.serviceName,
        serviceType: body.serviceType,
        projectValue: body.projectValue ?? 0,
        consultingFees: body.consultingFees ?? 0,
        governmentFees: body.governmentFees ?? 0,
        testingFees: body.testingFees ?? 0,
        customerName: body.customerName,
        company: body.company,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        scopeSummary: body.scopeSummary,
        waitingFor: body.waitingFor,
        waitingNote: body.waitingNote,
        waitingExpectedOn: body.waitingExpectedOn
          ? new Date(body.waitingExpectedOn)
          : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        expectedCompletion: body.expectedCompletion
          ? new Date(body.expectedCompletion)
          : undefined,
        lastActivityAt: new Date(),
        customer: body.customerId
          ? { connect: { id: body.customerId } }
          : undefined,
        lead: body.leadId ? { connect: { id: body.leadId } } : undefined,
        quotation: body.quotationId
          ? { connect: { id: body.quotationId } }
          : undefined,
        commercialOwner: body.commercialOwnerId
          ? { connect: { id: body.commercialOwnerId } }
          : undefined,
        deliveryOwner: body.deliveryOwnerId
          ? { connect: { id: body.deliveryOwnerId } }
          : undefined,
      },
      include: {
        commercialOwner: {
          select: { id: true, name: true, email: true },
        },
        deliveryOwner: {
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
      serviceName?: string | null;
      serviceType?: string | null;
      projectValue?: number;
      consultingFees?: number;
      governmentFees?: number;
      testingFees?: number;
      paymentStatus?: string;
      commercialOwnerId?: string | null;
      deliveryOwnerId?: string | null;
      waitingFor?: string | null;
      waitingNote?: string | null;
      waitingExpectedOn?: string | null;
      scopeSummary?: string | null;
      startDate?: string | null;
      expectedCompletion?: string | null;
      renewalDate?: string | null;
      customerName?: string;
      company?: string;
      email?: string;
      phone?: string | null;
      country?: string | null;
      state?: string | null;
    },
  ) {
    await this.get(id);
    return this.prisma.project.update({
      where: { id },
      data: {
        title: body.title,
        status: body.status,
        serviceName: body.serviceName,
        serviceType: body.serviceType,
        projectValue: body.projectValue,
        consultingFees: body.consultingFees,
        governmentFees: body.governmentFees,
        testingFees: body.testingFees,
        paymentStatus: body.paymentStatus,
        waitingFor: body.waitingFor,
        waitingNote: body.waitingNote,
        waitingExpectedOn:
          body.waitingExpectedOn === undefined
            ? undefined
            : body.waitingExpectedOn
              ? new Date(body.waitingExpectedOn)
              : null,
        scopeSummary: body.scopeSummary,
        startDate:
          body.startDate === undefined
            ? undefined
            : body.startDate
              ? new Date(body.startDate)
              : null,
        expectedCompletion:
          body.expectedCompletion === undefined
            ? undefined
            : body.expectedCompletion
              ? new Date(body.expectedCompletion)
              : null,
        renewalDate:
          body.renewalDate === undefined
            ? undefined
            : body.renewalDate
              ? new Date(body.renewalDate)
              : null,
        customerName: body.customerName,
        company: body.company,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        lastActivityAt: new Date(),
        commercialOwner:
          body.commercialOwnerId === undefined
            ? undefined
            : body.commercialOwnerId
              ? { connect: { id: body.commercialOwnerId } }
              : { disconnect: true },
        deliveryOwner:
          body.deliveryOwnerId === undefined
            ? undefined
            : body.deliveryOwnerId
              ? { connect: { id: body.deliveryOwnerId } }
              : { disconnect: true },
      },
      include: {
        commercialOwner: {
          select: { id: true, name: true, email: true },
        },
        deliveryOwner: {
          select: { id: true, name: true, email: true },
        },
        tasks: true,
        remarks: true,
      },
    });
  }

  async addRemark(
    projectId: string,
    body: { stage?: string; remark: string },
    createdById: string,
  ) {
    await this.get(projectId);
    const remark = await this.prisma.projectRemark.create({
      data: {
        projectId,
        stage: body.stage ?? 'Other',
        remark: body.remark,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    await this.prisma.project.update({
      where: { id: projectId },
      data: { lastActivityAt: new Date() },
    });
    return remark;
  }

  async addTask(
    projectId: string,
    body: {
      title: string;
      status?: string;
      waitingFor?: string;
      waitingExpectedOn?: string;
      waitingNote?: string;
      dueDate?: string;
      sequence?: number;
      notes?: string;
      assignedToId?: string;
    },
  ) {
    await this.get(projectId);
    const task = await this.prisma.projectTask.create({
      data: {
        projectId,
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
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    await this.prisma.project.update({
      where: { id: projectId },
      data: { lastActivityAt: new Date() },
    });
    return task;
  }

  async addProduct(
    projectId: string,
    body: {
      name: string;
      modelNumber?: string;
      brand?: string;
      hsCode?: string;
      description?: string;
      quantity?: number;
    },
  ) {
    await this.get(projectId);
    return this.prisma.projectProduct.create({
      data: { projectId, ...body, quantity: body.quantity ?? 1 },
    });
  }

  async addManufacturer(
    projectId: string,
    body: {
      name: string;
      country?: string;
      address?: string;
      email?: string;
      phone?: string;
      notes?: string;
    },
  ) {
    await this.get(projectId);
    return this.prisma.manufacturer.create({
      data: { projectId, ...body },
    });
  }

  async addApplicant(
    projectId: string,
    body: {
      name: string;
      type?: string;
      email?: string;
      phone?: string;
      address?: string;
      gstin?: string;
      notes?: string;
    },
  ) {
    await this.get(projectId);
    return this.prisma.applicant.create({
      data: { projectId, ...body },
    });
  }

  async addStandard(
    projectId: string,
    body: {
      code: string;
      name: string;
      authority?: string;
      description?: string;
    },
  ) {
    await this.get(projectId);
    return this.prisma.serviceStandard.create({
      data: { projectId, ...body },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.project.delete({ where: { id } });
  }
}
