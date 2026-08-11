"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  statusTone,
  Button,
} from "@/components/ui";
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
  customerId?: string | null;
  leadSource?: { name: string };
  customer?: { id: string; company: string } | null;
  projects: Array<{ id: string; projectNumber: string; status: string }>;
  quotations: Array<{ id: string; quoteNumber: string; status: string }>;
  opportunities: Array<{ id: string; title: string; stage: string }>;
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<LeadDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<LeadDetail>(`/leads/${params.id}`)
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [params.id]);

  async function convert() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{
        quotation?: { id: string };
        customer: { id: string };
      }>(`/leads/${params.id}/convert`, {
        method: "POST",
        body: JSON.stringify({ createQuotation: true }),
      });
      if (res.quotation?.id) {
        router.push(`/quotations/${res.quotation.id}`);
        return;
      }
      router.push(`/customers/${res.customer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Convert failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-brand-grey">Loading lead…</p>;

  return (
    <div>
      <PageHeader
        title={data.customerName}
        subtitle={`${data.company} · ${data.leadSource?.name || "Source"}`}
        actions={
          <>
            <Badge tone={statusTone(data.status)}>{data.status}</Badge>
            <Button type="button" disabled={busy} onClick={convert}>
              {busy ? "Converting…" : "Convert → Customer + Quote"}
            </Button>
          </>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="space-y-1 text-sm">
            <p>Email: {data.email}</p>
            <p>Phone: {data.phone}</p>
            <p>Service: {data.serviceName || "—"}</p>
            <p>Product: {data.product || "—"}</p>
            <p>Expected value: {formatINR(data.expectedValue)}</p>
            {data.customer ? (
              <p>
                Customer:{" "}
                <Link
                  href={`/customers/${data.customer.id}`}
                  className="font-semibold text-brand-teal"
                >
                  {data.customer.company}
                </Link>
              </p>
            ) : null}
            <p className="text-brand-grey">{data.notes}</p>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Linked work</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data.opportunities.map((o) => (
              <Link
                key={o.id}
                href="/opportunities"
                className="block text-brand-teal"
              >
                Opportunity {o.title} · {o.stage}
              </Link>
            ))}
            {data.projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block text-brand-teal"
              >
                Project {p.projectNumber} · {p.status}
              </Link>
            ))}
            {data.quotations.map((q) => (
              <Link
                key={q.id}
                href={`/quotations/${q.id}`}
                className="block text-brand-teal"
              >
                Quote {q.quoteNumber} · {q.status}
              </Link>
            ))}
            {!data.projects.length &&
            !data.quotations.length &&
            !data.opportunities.length ? (
              <p className="text-brand-grey">
                Convert this lead to create customer, opportunity and draft quote.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
