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
  Stat,
} from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  status: string;
  spentAt: string;
  vendor?: { name: string } | null;
  project?: { projectNumber: string } | null;
};

type Vendor = { id: string; name: string };

export default function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api<Expense[]>("/expenses")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Vendor[]>("/vendors").then(setVendors).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api("/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: fd.get("title"),
          category: fd.get("category") || "GENERAL",
          amount: Number(fd.get("amount") || 0),
          status: fd.get("status") || "SUBMITTED",
          spentAt: fd.get("spentAt") || undefined,
          vendorId: fd.get("vendorId") || undefined,
          reference: fd.get("reference") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track travel, courier, lab bills and office spend against the business."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New expense"}
          </Button>
        }
      />
      <div className="mb-4">
        <Stat label="Listed total" value={formatINR(total)} />
      </div>
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Title">
              <input name="title" required className={inputClass} />
            </Field>
            <Field label="Category">
              <select name="category" className={inputClass} defaultValue="GENERAL">
                {["GENERAL", "TRAVEL", "COURIER", "LAB", "OFFICE", "MARKETING", "SOFTWARE", "OTHER"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Amount ₹">
              <input name="amount" type="number" required className={inputClass} />
            </Field>
            <Field label="Vendor">
              <select name="vendorId" className={inputClass} defaultValue="">
                <option value="">—</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Spent on">
              <input name="spentAt" type="date" className={inputClass} />
            </Field>
            <Field label="Reference">
              <input name="reference" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Save expense</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length ? (
          <EmptyState title="No expenses" body="Log operating costs here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Vendor</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-brand-line/70">
                    <td className="py-3 font-semibold">{r.title}</td>
                    <td>{r.category}</td>
                    <td>{r.vendor?.name || "—"}</td>
                    <td>{formatINR(r.amount)}</td>
                    <td>{new Date(r.spentAt).toLocaleDateString()}</td>
                    <td>
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
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
