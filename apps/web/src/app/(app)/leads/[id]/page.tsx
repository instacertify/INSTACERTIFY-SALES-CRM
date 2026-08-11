"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type LeadDetail = {
  id: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  serviceName?: string | null;
  product?: string | null;
  expectedValue: number;
  notes?: string | null;
  leadSource?: { name: string };
  projects: Array<{ id: string; projectNumber: string; status: string }>;
  quotations: Array<{ id: string; quoteNumber: string; status: string }>;
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<LeadDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<LeadDetail>(`/leads/${params.id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-brand-grey">Loading lead…</p>;

  return (
    <div>
      <PageHeader
        title={data.customerName}
        subtitle={`${data.company} · ${data.leadSource?.name || "Source"}`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <Badge tone={statusTone(data.status)}>{data.status}</Badge>
          <div className="mt-3 space-y-1 text-sm">
            <p>Email: {data.email}</p>
            <p>Phone: {data.phone}</p>
            <p>Service: {data.serviceName || "—"}</p>
            <p>Product: {data.product || "—"}</p>
            <p>Expected value: {formatINR(data.expectedValue)}</p>
            <p className="text-brand-grey">{data.notes}</p>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Linked work</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data.projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="block text-brand-teal">
                Project {p.projectNumber} · {p.status}
              </Link>
            ))}
            {data.quotations.map((q) => (
              <Link key={q.id} href={`/quotations`} className="block text-brand-teal">
                Quote {q.quoteNumber} · {q.status}
              </Link>
            ))}
            {!data.projects.length && !data.quotations.length ? (
              <p className="text-brand-grey">No projects or quotations yet.</p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
