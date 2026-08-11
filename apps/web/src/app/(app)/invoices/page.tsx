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

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  dueDate?: string;
  customer: { id: string; company: string };
  project?: { id: string; projectNumber: string };
  payments: { amount: number }[];
};

type Customer = { id: string; company: string };

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<Invoice[]>("/invoices")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Customer[]>("/customers").then(setCustomers).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const subtotal = Number(fd.get("subtotal") || 0);
    const taxAmount = Number(fd.get("taxAmount") || Math.round(subtotal * 0.18));
    try {
      const inv = await api<{ id: string }>("/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId: fd.get("customerId"),
          subtotal,
          taxAmount,
          total: subtotal + taxAmount,
          status: "SENT",
          dueDate: fd.get("dueDate") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      window.location.href = `/invoices/${inv.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Accounts receivable — issue invoices and record customer payments."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New invoice"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <Field label="Subtotal ₹">
              <input name="subtotal" type="number" required className={inputClass} />
            </Field>
            <Field label="Tax ₹ (optional)">
              <input name="taxAmount" type="number" className={inputClass} />
            </Field>
            <Field label="Due date">
              <input name="dueDate" type="date" className={inputClass} />
            </Field>
            <Field label="Notes">
              <input name="notes" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>
                Create
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length ? (
          <EmptyState title="No invoices" body="Accept a quotation or create an invoice." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Project</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  return (
                    <tr key={inv.id} className="border-b border-brand-line/70">
                      <td className="py-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-semibold text-brand-teal"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td>{inv.customer.company}</td>
                      <td>{inv.project?.projectNumber || "—"}</td>
                      <td>{formatINR(inv.total)}</td>
                      <td>{formatINR(paid)}</td>
                      <td>
                        <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
