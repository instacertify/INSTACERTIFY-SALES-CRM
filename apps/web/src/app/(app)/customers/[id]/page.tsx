"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type CustomerDetail = {
  id: string;
  company: string;
  legalName?: string | null;
  email: string;
  phone?: string | null;
  country: string;
  lifetimeValue: number;
  contacts: Array<{ id: string; name: string; email?: string | null; title?: string | null; isPrimary: boolean }>;
  projects: Array<{
    id: string;
    projectNumber: string;
    title: string;
    status: string;
    serviceName?: string | null;
    projectValue: number;
  }>;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<CustomerDetail>(`/customers/${params.id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-brand-grey">Loading customer…</p>;

  return (
    <div>
      <PageHeader
        title={data.company}
        subtitle={data.legalName || data.email}
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <div className="mt-3 space-y-1 text-sm">
            <p>Email: {data.email}</p>
            <p>Phone: {data.phone || "—"}</p>
            <p>Country: {data.country}</p>
            <p>Lifetime value: {formatINR(data.lifetimeValue)}</p>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Contacts</h2>
          <div className="mt-3 space-y-2">
            {data.contacts.map((c) => (
              <div key={c.id} className="rounded-xl bg-brand-soft/50 px-3 py-2 text-sm">
                <strong>{c.name}</strong>
                {c.isPrimary ? (
                  <Badge tone="teal">Primary</Badge>
                ) : null}
                <div className="text-brand-grey">
                  {c.title || "Contact"} · {c.email || "—"}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel>
        <h2 className="font-display text-lg font-semibold">Projects</h2>
        <div className="mt-4 space-y-2">
          {data.projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-brand-line px-3 py-3"
            >
              <div>
                <p className="font-semibold">{p.projectNumber}</p>
                <p className="text-sm text-brand-grey">
                  {p.serviceName || p.title} · {formatINR(p.projectValue)}
                </p>
              </div>
              <Badge tone={statusTone(p.status)}>{p.status}</Badge>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
