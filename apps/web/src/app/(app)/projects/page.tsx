"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Project = {
  id: string;
  projectNumber: string;
  title: string;
  company: string;
  status: string;
  serviceName?: string | null;
  serviceType?: string | null;
  projectValue: number;
  waitingFor?: string | null;
  commercialOwner?: { name: string } | null;
  deliveryOwner?: { name: string } | null;
};

export default function ProjectsPage() {
  const [rows, setRows] = useState<Project[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Project[]>("/projects")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Control tower for certification delivery — owners, waiting-for, testing and documents."
      />
      {error ? <p className="text-rose-600">{error}</p> : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState title="No projects" body="Accept a quotation or create a project from a won lead." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2 font-semibold">Project</th>
                  <th className="py-2 font-semibold">Service</th>
                  <th className="py-2 font-semibold">Owners</th>
                  <th className="py-2 font-semibold">Value</th>
                  <th className="py-2 font-semibold">Waiting</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <Link href={`/projects/${p.id}`} className="font-semibold text-brand-teal">
                        {p.projectNumber}
                      </Link>
                      <div className="text-xs text-brand-grey">{p.company}</div>
                    </td>
                    <td>
                      {p.serviceType || "—"}
                      <div className="text-xs text-brand-grey">{p.serviceName}</div>
                    </td>
                    <td className="text-xs">
                      <div>C: {p.commercialOwner?.name || "—"}</div>
                      <div>D: {p.deliveryOwner?.name || "—"}</div>
                    </td>
                    <td>{formatINR(p.projectValue)}</td>
                    <td>{p.waitingFor || "—"}</td>
                    <td>
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
