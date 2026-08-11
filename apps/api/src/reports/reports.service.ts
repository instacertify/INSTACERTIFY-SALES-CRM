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
      acceptedQuotes,
      testingOrders,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.project.count({
        where: { status: { notIn: ['COMPLETED', 'CLOSED', 'LOST'] } },
      }),
      this.prisma.project.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.projectTask.count({
        where: { status: { not: 'COMPLETED' } },
      }),
      this.prisma.project.count({
        where: {
          waitingFor: { not: null },
          status: { notIn: ['COMPLETED', 'CLOSED', 'LOST'] },
        },
      }),
      this.prisma.quotation.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.invoice.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.quotation.findMany({
        where: { status: 'ACCEPTED' },
        select: {
          consultingPrice: true,
          testingPrice: true,
          otherCommercials: true,
          governmentFees: true,
          createdById: true,
          createdBy: { select: { id: true, name: true } },
          lineItems: { select: { amount: true, kind: true } },
        },
      }),
      this.prisma.testingOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const salesByPersonMap = new Map<
      string,
      { userId: string; name: string; deals: number; salesValue: number; testingValue: number }
    >();

    for (const q of acceptedQuotes) {
      const lineTotal = q.lineItems.reduce((s, l) => s + l.amount, 0);
      const fallback =
        q.consultingPrice +
        q.testingPrice +
        q.otherCommercials +
        q.governmentFees;
      const total = lineTotal > 0 ? lineTotal : fallback;
      const testingValue =
        q.lineItems
          .filter((l) => l.kind === 'TESTING')
          .reduce((s, l) => s + l.amount, 0) || q.testingPrice;

      const key = q.createdById;
      const prev = salesByPersonMap.get(key) || {
        userId: key,
        name: q.createdBy.name,
        deals: 0,
        salesValue: 0,
        testingValue: 0,
      };
      prev.deals += 1;
      prev.salesValue += total;
      prev.testingValue += testingValue;
      salesByPersonMap.set(key, prev);
    }

    const salesByPerson = [...salesByPersonMap.values()].sort(
      (a, b) => b.salesValue - a.salesValue,
    );

    const quotePie = Object.fromEntries(
      quotationsByStatus.map((r) => [r.status, r._count._all]),
    );
    const projectPie = Object.fromEntries(
      projectsByStatus.map((r) => [r.status, r._count._all]),
    );
    const testingPie = Object.fromEntries(
      testingOrders.map((r) => [r.status, r._count._all]),
    );

    const totalSales = salesByPerson.reduce((s, p) => s + p.salesValue, 0);
    const totalTestingSales = salesByPerson.reduce(
      (s, p) => s + p.testingValue,
      0,
    );

    return {
      counts: {
        leads: leadsTotal,
        customers: customersTotal,
        activeProjects: projectsTotal,
        openTasks,
        waitingProjects,
        openQuotations: Object.entries(quotePie)
          .filter(([k]) =>
            ['SHARED', 'REVISION_REQUESTED', 'DRAFT'].includes(k),
          )
          .reduce((s, [, n]) => s + n, 0),
        totalSales,
        totalTestingSales,
      },
      leads: {
        total: leadsTotal,
        byStatus: Object.fromEntries(
          leadsByStatus.map((r) => [r.status, r._count._all]),
        ),
      },
      customers: { total: customersTotal },
      projects: {
        total: projectsTotal,
        byStatus: projectPie,
        waiting: waitingProjects,
      },
      openTasks,
      quotations: { byStatus: quotePie },
      invoices: {
        byStatus: Object.fromEntries(
          invoicesByStatus.map((r) => [r.status, r._count._all]),
        ),
      },
      pies: {
        quotations: quotePie,
        projects: projectPie,
        testing: testingPie,
        salesByPerson: Object.fromEntries(
          salesByPerson.map((p) => [p.name, Math.round(p.salesValue)]),
        ),
      },
      salesByPerson,
    };
  }
}
