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

  /** AR aging + testing margin + expense totals for ERP finance view */
  async finance() {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { notIn: ['VOID'] } },
      include: {
        payments: true,
        customer: { select: { id: true, company: true } },
      },
    });

    const aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      older: 0,
      totalOutstanding: 0,
    };

    const openInvoices = [];
    for (const inv of invoices) {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const due = Math.max(0, inv.total - paid);
      if (due <= 0 || inv.status === 'PAID') continue;
      const dueDate = inv.dueDate || inv.issuedAt || inv.createdAt;
      const days = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days <= 0) aging.current += due;
      else if (days <= 30) aging.days30 += due;
      else if (days <= 60) aging.days60 += due;
      else if (days <= 90) aging.days90 += due;
      else aging.older += due;
      aging.totalOutstanding += due;
      openInvoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer.company,
        total: inv.total,
        paid,
        due,
        status: inv.status,
        dueDate: inv.dueDate,
        daysOverdue: Math.max(0, days),
      });
    }

    const testingOrders = await this.prisma.testingOrder.findMany({
      select: { purchasePrice: true, salesPrice: true, status: true },
    });
    const testingMargin = testingOrders.reduce(
      (acc, t) => {
        acc.sales += t.salesPrice;
        acc.cost += t.purchasePrice;
        return acc;
      },
      { sales: 0, cost: 0, margin: 0 },
    );
    testingMargin.margin = testingMargin.sales - testingMargin.cost;

    const expenses = await this.prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { status: { in: ['SUBMITTED', 'APPROVED', 'PAID'] } },
    });
    const expenseTotal = expenses.reduce(
      (s, e) => s + (e._sum.amount || 0),
      0,
    );

    const poOpen = await this.prisma.purchaseOrder.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ['CANCELLED', 'BILLED'] } },
    });

    return {
      aging,
      openInvoices: openInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue),
      testingMargin,
      expensesByCategory: Object.fromEntries(
        expenses.map((e) => [e.category, e._sum.amount || 0]),
      ),
      expenseTotal,
      openPurchaseOrders: poOpen._sum.total || 0,
    };
  }
}
