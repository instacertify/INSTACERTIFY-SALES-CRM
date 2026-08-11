"use client";

import { FormEvent, useEffect, useState } from "react";
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

const STAGES = [
  "DISCOVERY",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

type Opp = {
  id: string;
  title: string;
  stage: string;
  amount: number;
  probability: number;
  serviceName?: string;
  customer: { id: string; company: string };
  owner?: { name: string } | null;
};

type Customer = { id: string; company: string };

export default function OpportunitiesPage() {
  const [rows, setRows] = useState<Opp[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api<Opp[]>("/opportunities")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Customer[]>("/customers").then(setCustomers).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api("/opportunities", {
        method: "POST",
        body: JSON.stringify({
          title: fd.get("title"),
          customerId: fd.get("customerId"),
          stage: fd.get("stage") || "DISCOVERY",
          amount: Number(fd.get("amount") || 0),
          probability: Number(fd.get("probability") || 20),
          serviceName: fd.get("serviceName") || undefined,
        }),
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function moveStage(id: string, stage: string) {
    try {
      await api(`/opportunities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Pipeline board — discovery to won deals before quotation."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New opportunity"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Title">
              <input name="title" required className={inputClass} />
            </Field>
            <Field label="Customer">
              <select name="customerId" required className={inputClass}>
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service">
              <input name="serviceName" className={inputClass} />
            </Field>
            <Field label="Amount ₹">
              <input name="amount" type="number" defaultValue={0} className={inputClass} />
            </Field>
            <Field label="Probability %">
              <input name="probability" type="number" defaultValue={20} className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {!rows.length ? (
        <Panel>
          <EmptyState title="No opportunities" body="Convert a lead or create one." />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const items = rows.filter((r) => r.stage === stage);
            return (
              <Panel key={stage} className="min-h-[200px] !p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-grey">
                    {stage}
                  </p>
                  <Badge tone={statusTone(stage)}>{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-xl border border-brand-line bg-brand-soft/40 p-3"
                    >
                      <p className="text-sm font-semibold text-brand-ink">
                        {o.title}
                      </p>
                      <p className="text-xs text-brand-grey">
                        {o.customer.company}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatINR(o.amount)}
                      </p>
                      <select
                        className={`${inputClass} mt-2`}
                        value={o.stage}
                        onChange={(e) => moveStage(o.id, e.target.value)}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
