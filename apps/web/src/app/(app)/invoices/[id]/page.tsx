"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  statusTone,
  Button,
  Field,
  inputClass,
  Stat,
} from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  dueDate?: string;
  notes?: string;
  customer: { id: string; company: string };
  project?: { id: string; projectNumber: string; title: string };
  payments: {
    id: string;
    amount: number;
    method: string;
    reference?: string;
    receivedAt: string;
  }[];
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<Invoice>(`/invoices/${id}`)
      .then(setInvoice)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  async function addPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api(`/invoices/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(fd.get("amount")),
          method: fd.get("method") || "BANK_TRANSFER",
          reference: fd.get("reference") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  if (!invoice && !error) return <p className="text-sm text-brand-grey">Loading…</p>;
  if (!invoice) return <p className="text-rose-600">{error}</p>;

  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, invoice.total - paid);

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={invoice.customer.company}
        actions={<Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>}
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Total" value={formatINR(invoice.total)} />
        <Stat label="Paid" value={formatINR(paid)} />
        <Stat label="Outstanding" value={formatINR(due)} />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="text-sm">
            Subtotal {formatINR(invoice.subtotal)} · Tax{" "}
            {formatINR(invoice.taxAmount)}
          </p>
          {invoice.dueDate ? (
            <p className="mt-1 text-sm text-brand-grey">
              Due {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          ) : null}
          {invoice.project ? (
            <Link
              href={`/projects/${invoice.project.id}`}
              className="mt-2 inline-block font-semibold text-brand-teal"
            >
              {invoice.project.projectNumber} — {invoice.project.title}
            </Link>
          ) : null}
          {invoice.notes ? (
            <p className="mt-2 text-sm text-brand-grey">{invoice.notes}</p>
          ) : null}
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Record payment</h2>
          <form onSubmit={addPayment} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Amount ₹">
              <input
                name="amount"
                type="number"
                required
                defaultValue={due || undefined}
                className={inputClass}
              />
            </Field>
            <Field label="Method">
              <select name="method" className={inputClass} defaultValue="BANK_TRANSFER">
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Reference">
              <input name="reference" className={inputClass} />
            </Field>
            <Field label="Notes">
              <input name="notes" className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving || due <= 0}>
                {saving ? "Saving…" : "Add payment"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
      <Panel>
        <h2 className="font-display text-lg font-semibold">Payments</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {invoice.payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap gap-3 border-b border-brand-line/60 py-2"
            >
              <span className="font-semibold">{formatINR(p.amount)}</span>
              <span>{p.method}</span>
              <span className="text-brand-grey">
                {new Date(p.receivedAt).toLocaleString()}
              </span>
              <span>{p.reference}</span>
            </li>
          ))}
          {!invoice.payments.length ? (
            <li className="text-brand-grey">No payments yet</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
