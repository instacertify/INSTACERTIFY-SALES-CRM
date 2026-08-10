"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Entry = {
  id: string;
  title: string;
  category: string;
  summary: string;
  status: string;
  effortHours: number;
  valueAmount: number;
  happenedAt: string;
  tags: string;
  customer: { id: string; company: string };
  project?: { id: string; projectNumber: string } | null;
  createdBy?: { name: string } | null;
};

type Customer = { id: string; company: string };

export default function WorkLibraryPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function load(term = "") {
    const data = await api<Entry[]>(
      `/work-library?q=${encodeURIComponent(term)}`,
    );
    setRows(data);
  }

  useEffect(() => {
    Promise.all([load(""), api<Customer[]>("/customers")])
      .then(([, c]) => setCustomers(c))
      .catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api("/work-library", {
      method: "POST",
      body: JSON.stringify({
        customerId: form.get("customerId"),
        title: form.get("title"),
        category: form.get("category"),
        summary: form.get("summary"),
        valueAmount: Number(form.get("valueAmount") || 0),
        effortHours: Number(form.get("effortHours") || 0),
        tags: form.get("tags") || "",
      }),
    });
    (e.target as HTMLFormElement).reset();
    await load(q);
  }

  return (
    <div>
      <PageHeader
        title="Work library"
        subtitle="Map interactive delivery history — quotes, documents, testing and certifications done for each client."
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}

      <Panel className="mb-4">
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search work…"
            className="w-full rounded-xl border border-brand-line px-3 py-2 text-sm"
          />
          <button className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </form>

        <form
          onSubmit={onCreate}
          className="grid gap-2 rounded-xl bg-brand-soft/50 p-3 md:grid-cols-2"
        >
          <select
            name="customerId"
            required
            className="rounded-xl border border-brand-line px-3 py-2 text-sm"
          >
            <option value="">Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue="TESTING"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm"
          >
            {["QUOTE", "DOCUMENT", "TESTING", "APPLICATION", "CERTIFICATION", "PAYMENT", "COMMUNICATION", "OTHER"].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
          </select>
          <input
            name="title"
            required
            placeholder="Work title"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm md:col-span-2"
          />
          <textarea
            name="summary"
            required
            placeholder="What was done?"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="valueAmount"
            type="number"
            placeholder="Value (INR)"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm"
          />
          <input
            name="effortHours"
            type="number"
            step="0.5"
            placeholder="Hours"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm"
          />
          <input
            name="tags"
            placeholder="tags (comma)"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm md:col-span-2"
          />
          <button className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white md:col-span-2">
            Add work entry
          </button>
        </form>
      </Panel>

      <div className="space-y-3">
        {rows.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-brand-grey">
                  <Link
                    href={`/customers/${r.customer.id}`}
                    className="text-brand-teal"
                  >
                    {r.customer.company}
                  </Link>
                  {r.project ? ` · ${r.project.projectNumber}` : ""}
                  {r.createdBy ? ` · ${r.createdBy.name}` : ""}
                </p>
              </div>
              <Badge tone={statusTone(r.category)}>{r.category}</Badge>
            </div>
            <p className="mt-2 text-sm">{r.summary}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-brand-grey">
              <span>{new Date(r.happenedAt).toLocaleDateString()}</span>
              <span>{r.effortHours}h</span>
              <span>{formatINR(r.valueAmount)}</span>
              {r.tags ? <span>{r.tags}</span> : null}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
