"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Stat, Badge, statusTone } from "@/components/ui";
import { labelStatus } from "@/lib/utils";

type Dashboard = {
  leads?: { total?: number; byStatus?: Record<string, number> };
  customers?: { total?: number };
  projects?: {
    total?: number;
    byStatus?: Record<string, number>;
    waiting?: number;
  };
  openTasks?: number;
  quotations?: { byStatus?: Record<string, number> };
  // fallback shape
  counts?: {
    leads: number;
    customers: number;
    activeProjects: number;
    openTasks: number;
    waitingProjects: number;
    openQuotations: number;
  };
  projectsByStatus?: Record<string, number>;
  recentProjects?: Array<{
    id: string;
    projectNumber: string;
    company: string;
    status: string;
    waitingFor?: string | null;
    serviceName?: string | null;
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
        setProjects(proj.slice(0, 8));
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-brand-grey">Loading dashboard…</p>;

  const openQuotations = Object.entries(data.quotations?.byStatus || {})
    .filter(([k]) => ["SHARED", "REVISION_REQUESTED", "DRAFT"].includes(k))
    .reduce((s, [, n]) => s + n, 0);

  const counts = {
    customers: data.counts?.customers ?? data.customers?.total ?? 0,
    activeProjects: data.counts?.activeProjects ?? data.projects?.total ?? 0,
    waitingProjects:
      data.counts?.waitingProjects ?? data.projects?.waiting ?? 0,
    openTasks: data.counts?.openTasks ?? data.openTasks ?? 0,
    leads: data.counts?.leads ?? data.leads?.total ?? 0,
    openQuotations: data.counts?.openQuotations ?? openQuotations,
  };

  const projectsByStatus =
    data.projectsByStatus || data.projects?.byStatus || {};

  return (
    <div>
      <PageHeader
        title="Control tower"
        subtitle="Project-centric view across leads, customers, testing and delivery."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Customers" value={counts.customers} />
        <Stat label="Active projects" value={counts.activeProjects} />
        <Stat label="Waiting projects" value={counts.waitingProjects} />
        <Stat label="Open tasks" value={counts.openTasks} />
        <Stat label="Leads" value={counts.leads} />
        <Stat label="Open quotations" value={counts.openQuotations} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-xl font-semibold">Project pipeline</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(projectsByStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-xl bg-brand-soft/60 px-3 py-2 text-sm"
              >
                <span>{labelStatus(status)}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold">Recent projects</h2>
          <div className="mt-4 space-y-3">
            {(data.recentProjects || projects).map((p) => (
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
                {p.waitingFor ? (
                  <p className="mt-2 text-xs text-brand-orange">
                    Waiting for {p.waitingFor}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
