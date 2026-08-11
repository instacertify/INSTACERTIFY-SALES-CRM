"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Stat, Badge, statusTone } from "@/components/ui";
import { PieChart, HorizontalBars } from "@/components/Charts";
import { formatINR } from "@/lib/utils";

type Dashboard = {
  counts: {
    leads: number;
    customers: number;
    activeProjects: number;
    openTasks: number;
    waitingProjects: number;
    openQuotations: number;
    totalSales: number;
    totalTestingSales: number;
  };
  pies: {
    quotations: Record<string, number>;
    projects: Record<string, number>;
    testing: Record<string, number>;
    salesByPerson: Record<string, number>;
  };
  salesByPerson: Array<{
    userId: string;
    name: string;
    deals: number;
    salesValue: number;
    testingValue: number;
  }>;
};

type Project = {
  id: string;
  projectNumber: string;
  company: string;
  status: string;
  waitingFor?: string | null;
  serviceName?: string | null;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Dashboard>("/reports/dashboard"),
      api<Project[]>("/projects"),
    ])
      .then(([dash, proj]) => {
        setData(dash);
        setProjects(proj.slice(0, 6));
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-brand-grey">Loading dashboard…</p>;

  return (
    <div>
      <PageHeader
        title="Sales control tower"
        subtitle="Certification consulting + testing productivity — quotes, labs, and person-wise sales."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Won sales value" value={formatINR(data.counts.totalSales || 0)} />
        <Stat
          label="Testing sales"
          value={formatINR(data.counts.totalTestingSales || 0)}
        />
        <Stat label="Active projects" value={data.counts.activeProjects} />
        <Stat label="Open quotations" value={data.counts.openQuotations} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-xl font-semibold">Quote pipeline</h2>
          <div className="mt-4">
            <PieChart data={data.pies?.quotations || {}} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold">Project status</h2>
          <div className="mt-4">
            <PieChart data={data.pies?.projects || {}} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold">Testing orders</h2>
          <div className="mt-4">
            <PieChart data={data.pies?.testing || {}} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold">
            Sales by person
          </h2>
          <p className="mt-1 text-xs text-brand-grey">
            Accepted quote value attributed to quote owner
          </p>
          <div className="mt-4">
            <HorizontalBars
              data={(data.salesByPerson || []).map((p) => ({
                label: `${p.name} (${p.deals})`,
                value: p.salesValue,
              }))}
              formatValue={formatINR}
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <h2 className="font-display text-xl font-semibold">Recent projects</h2>
        <div className="mt-4 space-y-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block rounded-xl border border-brand-line px-3 py-3 transition hover:border-brand-teal"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.projectNumber}</p>
                  <p className="text-sm text-brand-grey">
                    {p.company} · {p.serviceName || "Service"}
                  </p>
                </div>
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
