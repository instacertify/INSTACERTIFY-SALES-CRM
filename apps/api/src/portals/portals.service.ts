import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalsService {
  constructor(private readonly prisma: PrismaService) {}

  private token() {
    return randomBytes(24).toString('hex');
  }

  // ── Document checklist ──────────────────────────────────────────

  listDocRequests(query: { customerId?: string; projectId?: string }) {
    return this.prisma.documentRequest.findMany({
      where: {
        customerId: query.customerId,
        projectId: query.projectId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        serviceOffering: true,
        customer: { select: { id: true, company: true } },
        project: { select: { id: true, projectNumber: true } },
      },
    });
  }

  async createDocRequest(
    body: {
      title?: string;
      serviceOfferingId?: string;
      customerId?: string;
      projectId?: string;
      quotationId?: string;
      teamRemark?: string;
      itemNames?: string[];
    },
    createdById: string,
  ) {
    let items: Array<{ name: string; description?: string; required: boolean }> =
      [];
    if (body.serviceOfferingId) {
      const offering = await this.prisma.serviceOffering.findUnique({
        where: { id: body.serviceOfferingId },
        include: { checklistItems: { orderBy: { sequence: 'asc' } } },
      });
      if (!offering) throw new NotFoundException('Service offering not found');
      items = offering.checklistItems.map((c) => ({
        name: c.name,
        description: c.description || undefined,
        required: c.required,
      }));
    } else if (body.itemNames?.length) {
      items = body.itemNames.map((name) => ({ name, required: true }));
    } else {
      throw new BadRequestException(
        'Provide serviceOfferingId or itemNames for checklist',
      );
    }

    return this.prisma.documentRequest.create({
      data: {
        publicToken: this.token(),
        title:
          body.title ||
          'Document checklist — please upload required documents',
        teamRemark: body.teamRemark,
        serviceOfferingId: body.serviceOfferingId,
        customerId: body.customerId,
        projectId: body.projectId,
        quotationId: body.quotationId,
        createdById,
        items: {
          create: items.map((i) => ({
            name: i.name,
            description: i.description,
            required: i.required,
          })),
        },
      },
      include: { items: true, serviceOffering: true },
    });
  }

  async getDocRequestPublic(token: string) {
    const req = await this.prisma.documentRequest.findUnique({
      where: { publicToken: token },
      include: {
        items: { orderBy: { name: 'asc' } },
        serviceOffering: true,
        customer: { select: { company: true } },
      },
    });
    if (!req) throw new NotFoundException('Checklist not found');
    return {
      title: req.title,
      status: req.status,
      teamRemark: req.teamRemark,
      customerNote: req.customerNote,
      company: req.customer?.company,
      serviceName: req.serviceOffering?.name,
      items: req.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        required: i.required,
        status: i.status,
        customerNote: i.customerNote,
        fileName: i.fileName,
        uploadedAt: i.uploadedAt,
      })),
    };
  }

  async submitDocItem(
    token: string,
    itemId: string,
    body: { customerNote?: string; fileName?: string; storedName?: string },
  ) {
    const req = await this.prisma.documentRequest.findUnique({
      where: { publicToken: token },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('Checklist not found');
    const item = req.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Checklist item not found');

    await this.prisma.documentRequestItem.update({
      where: { id: itemId },
      data: {
        status: 'UPLOADED',
        customerNote: body.customerNote,
        fileName: body.fileName || item.fileName || 'uploaded-file',
        storedName: body.storedName || body.fileName || 'uploaded-file',
        uploadedAt: new Date(),
      },
    });

    const refreshed = await this.prisma.documentRequestItem.findMany({
      where: { requestId: req.id },
    });
    const required = refreshed.filter((i) => i.required);
    const done = required.every((i) => i.status === 'UPLOADED' || i.status === 'VERIFIED');
    const any = refreshed.some((i) => i.status === 'UPLOADED' || i.status === 'VERIFIED');
    await this.prisma.documentRequest.update({
      where: { id: req.id },
      data: {
        status: done ? 'COMPLETE' : any ? 'PARTIAL' : 'SHARED',
        customerNote: body.customerNote || undefined,
      },
    });
    return this.getDocRequestPublic(token);
  }

  // ── Test request forms ──────────────────────────────────────────

  listTestRequests(query: { customerId?: string; projectId?: string }) {
    return this.prisma.testRequestForm.findMany({
      where: {
        customerId: query.customerId,
        projectId: query.projectId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, company: true } },
        project: { select: { id: true, projectNumber: true } },
        testingOrder: true,
      },
    });
  }

  createTestRequest(
    body: {
      customerId?: string;
      projectId?: string;
      quotationId?: string;
      testingOrderId?: string;
      testScope?: string;
      productName?: string;
    },
    createdById: string,
  ) {
    return this.prisma.testRequestForm.create({
      data: {
        publicToken: this.token(),
        customerId: body.customerId,
        projectId: body.projectId,
        quotationId: body.quotationId,
        testingOrderId: body.testingOrderId,
        testScope: body.testScope,
        productName: body.productName,
        createdById,
        status: 'SHARED',
      },
    });
  }

  async getTestRequestPublic(token: string) {
    const form = await this.prisma.testRequestForm.findUnique({
      where: { publicToken: token },
      include: {
        customer: { select: { company: true } },
        project: { select: { projectNumber: true, serviceName: true } },
      },
    });
    if (!form) throw new NotFoundException('Test request not found');
    return form;
  }

  async submitTestRequest(
    token: string,
    body: {
      productName?: string;
      modelNumber?: string;
      brand?: string;
      manufacturer?: string;
      sampleQuantity?: string;
      standards?: string;
      testScope?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      additionalNotes?: string;
    },
  ) {
    const existing = await this.prisma.testRequestForm.findUnique({
      where: { publicToken: token },
    });
    if (!existing) throw new NotFoundException('Test request not found');
    if (existing.status === 'SENT_TO_LAB') {
      throw new BadRequestException('Form already locked for lab');
    }
    return this.prisma.testRequestForm.update({
      where: { id: existing.id },
      data: {
        ...body,
        formJson: JSON.stringify(body),
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  async downloadTestRequest(id: string) {
    const form = await this.prisma.testRequestForm.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        testingOrder: { include: { partnerLab: true } },
      },
    });
    if (!form) throw new NotFoundException('Test request not found');
    await this.prisma.testRequestForm.update({
      where: { id },
      data: {
        downloadedAt: new Date(),
        status: form.status === 'SUBMITTED' ? 'DOWNLOADED' : form.status,
      },
    });

    // Plain-text lab pack — easy to share / print
    const text = [
      'INSTACERTIFY — TEST REQUEST FORM (FOR LAB)',
      '=========================================',
      `Status: ${form.status}`,
      `Customer: ${form.customer?.company || '—'}`,
      `Project: ${form.project?.projectNumber || '—'}`,
      `Lab: ${form.testingOrder?.partnerLab?.name || '—'}`,
      '',
      `Product: ${form.productName || '—'}`,
      `Model: ${form.modelNumber || '—'}`,
      `Brand: ${form.brand || '—'}`,
      `Manufacturer: ${form.manufacturer || '—'}`,
      `Sample qty: ${form.sampleQuantity || '—'}`,
      `Standards: ${form.standards || '—'}`,
      `Test scope: ${form.testScope || '—'}`,
      '',
      `Contact: ${form.contactName || '—'}`,
      `Email: ${form.contactEmail || '—'}`,
      `Phone: ${form.contactPhone || '—'}`,
      '',
      `Notes: ${form.additionalNotes || '—'}`,
      '',
      `Submitted: ${form.submittedAt?.toISOString() || 'not yet'}`,
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');

    return {
      filename: `test-request-${form.id.slice(0, 8)}.txt`,
      contentType: 'text/plain; charset=utf-8',
      content: text,
      form,
    };
  }

  async markSentToLab(id: string) {
    return this.prisma.testRequestForm.update({
      where: { id },
      data: { status: 'SENT_TO_LAB' },
    });
  }
}
