import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [
      leadsTotal,
      leadsByStatus,
      customersTotal,
      projectsTotal,
      projectsByStatus,
      openTasks,
      waitingProjects,
      quotationsByStatus,
      invoicesByStatus,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.project.count(),
      this.prisma.project.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.projectTask.count({
        where: { status: { not: 'COMPLETED' } },
      }),
      this.prisma.project.count({
        where: {
          waitingFor: { not: null },
          status: { notIn: ['COMPLETED', 'CLOSED', 'LOST'] },
        },
      }),
      this.prisma.quotation.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    return {
      leads: {
        total: leadsTotal,
        byStatus: Object.fromEntries(
          leadsByStatus.map((row) => [row.status, row._count._all]),
        ),
      },
      customers: {
        total: customersTotal,
      },
      projects: {
        total: projectsTotal,
        byStatus: Object.fromEntries(
          projectsByStatus.map((row) => [row.status, row._count._all]),
        ),
        waiting: waitingProjects,
      },
      openTasks,
      quotations: {
        byStatus: Object.fromEntries(
          quotationsByStatus.map((row) => [row.status, row._count._all]),
        ),
      },
      invoices: {
        byStatus: Object.fromEntries(
          invoicesByStatus.map((row) => [row.status, row._count._all]),
        ),
      },
    };
  }
}
