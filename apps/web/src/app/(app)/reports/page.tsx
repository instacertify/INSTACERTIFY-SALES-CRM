"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Stat, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Finance = {
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    older: number;
    totalOutstanding: number;
  };
  openInvoices: {
    id: string;
    invoiceNumber: string;
    customer: string;
    due: number;
    status: string;
    daysOverdue: number;
  }[];
  testingMargin: { sales: number; cost: number; margin: number };
  expensesByCategory: Record<string, number>;
  expenseTotal: number;
  openPurchaseOrders: number;
};

type Dashboard = {
  counts: {
    leads: number;
    customers: number;
    activeProjects: number;
    totalSales: number;
    totalTestingSales: number;
  };
  salesByPerson: { name: string; deals: number; salesValue: number }[];
};

export default function ReportsPage() {
  const [finance, setFinance] = useState<Finance | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Finance>("/reports/finance"),
      api<Dashboard>("/reports/dashboard"),
    ])
      .then(([f, d]) => {
        setFinance(f);
        setDash(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!finance || !dash) {
    return <p className="text-sm text-brand-grey">Loading reports…</p>;
  }

  return (
    <div>
      <PageHeader
        title="ERP reports"
        subtitle="AR aging, testing margin, expenses and sales by person."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Customers" value={dash.counts.customers} />
        <Stat label="Active projects" value={dash.counts.activeProjects} />
        <Stat label="Accepted sales" value={formatINR(dash.counts.totalSales)} />
        <Stat
          label="AR outstanding"
          value={formatINR(finance.aging.totalOutstanding)}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-lg font-semibold">AR aging</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {(
              [
                ["Current", finance.aging.current],
                ["1–30d", finance.aging.days30],
                ["31–60d", finance.aging.days60],
                ["61–90d", finance.aging.days90],
                ["90d+", finance.aging.older],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-brand-line bg-brand-soft/50 p-3"
              >
                <p className="text-xs font-semibold uppercase text-brand-grey">
                  {label}
                </p>
                <p className="mt-1 font-semibold">{formatINR(value)}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Testing margin</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <p>Sales {formatINR(finance.testingMargin.sales)}</p>
            <p>Lab cost {formatINR(finance.testingMargin.cost)}</p>
            <p className="font-display text-2xl font-semibold text-brand-teal">
              Margin {formatINR(finance.testingMargin.margin)}
            </p>
            <p className="text-brand-grey">
              Open POs {formatINR(finance.openPurchaseOrders)} · Expenses{" "}
              {formatINR(finance.expenseTotal)}
            </p>
          </div>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-lg font-semibold">Open invoices</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {finance.openInvoices.slice(0, 12).map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-2 border-b border-brand-line/60 py-2"
              >
                <Link
                  href={`/invoices/${inv.id}`}
                  className="font-semibold text-brand-teal"
                >
                  {inv.invoiceNumber}
                </Link>
                <span>{inv.customer}</span>
                <span>{formatINR(inv.due)}</span>
                <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                {inv.daysOverdue > 0 ? (
                  <span className="text-rose-600">{inv.daysOverdue}d overdue</span>
                ) : null}
              </li>
            ))}
            {!finance.openInvoices.length ? (
              <li className="text-brand-grey">No outstanding invoices</li>
            ) : null}
          </ul>
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Sales by person</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.salesByPerson.map((p) => (
              <li
                key={p.name}
                className="flex justify-between border-b border-brand-line/60 py-2"
              >
                <span>
                  {p.name}{" "}
                  <span className="text-brand-grey">({p.deals} deals)</span>
                </span>
                <span className="font-semibold">{formatINR(p.salesValue)}</span>
              </li>
            ))}
            {!dash.salesByPerson.length ? (
              <li className="text-brand-grey">Accept quotations to populate</li>
            ) : null}
          </ul>
          <h3 className="mt-5 font-semibold">Expenses by category</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(finance.expensesByCategory).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span>{k}</span>
                <span>{formatINR(v)}</span>
              </li>
            ))}
            {!Object.keys(finance.expensesByCategory).length ? (
              <li className="text-brand-grey">No expenses logged</li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
