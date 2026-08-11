"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  statusTone,
  EmptyState,
  Button,
  Field,
  inputClass,
} from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Lead = {
  id: string;
  customerName: string;
  company: string;
  email: string;
  status: string;
  serviceName?: string | null;
  expectedValue: number;
  leadSource?: { name: string };
  assignedTo?: { name: string } | null;
};

type Source = { id: string; name: string };

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<Lead[]>("/leads")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Source[]>("/leads/sources").then(setSources).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const lead = await api<{ id: string }>("/leads", {
        method: "POST",
        body: JSON.stringify({
          customerName: fd.get("customerName"),
          company: fd.get("company"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          country: fd.get("country") || "India",
          state: fd.get("state") || undefined,
          serviceName: fd.get("serviceName") || undefined,
          product: fd.get("product") || undefined,
          expectedValue: Number(fd.get("expectedValue") || 0),
          leadSourceId: fd.get("leadSourceId"),
          notes: fd.get("notes") || undefined,
        }),
      });
      window.location.href = `/leads/${lead.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Enquiry pipeline → convert to customer, opportunity and draft quotation."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New lead"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form
            onSubmit={onCreate}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Field label="Contact name">
              <input name="customerName" required className={inputClass} />
            </Field>
            <Field label="Company">
              <input name="company" required className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" required className={inputClass} />
            </Field>
            <Field label="Source">
              <select name="leadSourceId" required className={inputClass}>
                <option value="">Select…</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service">
              <input name="serviceName" className={inputClass} />
            </Field>
            <Field label="Product">
              <input name="product" className={inputClass} />
            </Field>
            <Field label="Expected value ₹">
              <input name="expectedValue" type="number" defaultValue={0} className={inputClass} />
            </Field>
            <Field label="Country">
              <input name="country" defaultValue="India" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>
                Create lead
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState title="No leads" body="Create your first enquiry." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2 font-semibold">Lead</th>
                  <th className="py-2 font-semibold">Service</th>
                  <th className="py-2 font-semibold">Source</th>
                  <th className="py-2 font-semibold">Owner</th>
                  <th className="py-2 font-semibold">Value</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <Link
                        href={`/leads/${l.id}`}
                        className="font-semibold text-brand-teal"
                      >
                        {l.customerName}
                      </Link>
                      <div className="text-xs text-brand-grey">
                        {l.company} · {l.email}
                      </div>
                    </td>
                    <td>{l.serviceName || "—"}</td>
                    <td>{l.leadSource?.name || "—"}</td>
                    <td>{l.assignedTo?.name || "—"}</td>
                    <td>{formatINR(l.expectedValue)}</td>
                    <td>
                      <Badge tone={statusTone(l.status)}>{l.status}</Badge>
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
