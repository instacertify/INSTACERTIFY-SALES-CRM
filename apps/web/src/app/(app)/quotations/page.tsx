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

type Quote = {
  id: string;
  quoteNumber: string;
  company: string;
  serviceName: string;
  status: string;
  consultingPrice: number;
  testingPrice: number;
  otherCommercials: number;
  governmentFees: number;
};

type Customer = { id: string; company: string; email: string; phone?: string; country: string; state?: string };

export default function QuotationsPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<Quote[]>("/quotations")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Customer[]>("/customers").then(setCustomers).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const customerId = String(fd.get("customerId") || "");
    const customer = customers.find((c) => c.id === customerId);
    const validity = new Date();
    validity.setDate(validity.getDate() + 30);
    try {
      const created = await api<{ id: string }>("/quotations", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerId || undefined,
          customerName: fd.get("customerName") || customer?.company,
          company: fd.get("company") || customer?.company,
          email: fd.get("email") || customer?.email,
          phone: fd.get("phone") || customer?.phone || "-",
          country: fd.get("country") || customer?.country || "India",
          state: fd.get("state") || customer?.state,
          serviceName: fd.get("serviceName"),
          description: fd.get("description") || "",
          validityDate: validity.toISOString(),
          consultingPrice: Number(fd.get("consultingPrice") || 0),
          testingPrice: Number(fd.get("testingPrice") || 0),
          governmentFees: Number(fd.get("governmentFees") || 0),
        }),
      });
      setShowForm(false);
      window.location.href = `/quotations/${created.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Build consulting + testing proposals, share, revise, then accept into a project."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New quotation"}
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
            <Field label="Customer (optional)">
              <select name="customerId" className={inputClass} defaultValue="">
                <option value="">— Manual entry —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Company">
              <input name="company" className={inputClass} />
            </Field>
            <Field label="Contact name">
              <input name="customerName" className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="Service">
              <input
                name="serviceName"
                required
                placeholder="BIS / WPC / Testing bundle"
                className={inputClass}
              />
            </Field>
            <Field label="Consulting ₹">
              <input
                name="consultingPrice"
                type="number"
                defaultValue={0}
                className={inputClass}
              />
            </Field>
            <Field label="Testing ₹">
              <input
                name="testingPrice"
                type="number"
                defaultValue={0}
                className={inputClass}
              />
            </Field>
            <Field label="Govt fees ₹">
              <input
                name="governmentFees"
                type="number"
                defaultValue={0}
                className={inputClass}
              />
            </Field>
            <Field label="Description">
              <input name="description" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create quotation"}
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState
            title="No quotations"
            body="Create a quotation or convert a lead."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2 font-semibold">Quote</th>
                  <th className="py-2 font-semibold">Company</th>
                  <th className="py-2 font-semibold">Service</th>
                  <th className="py-2 font-semibold">Total</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => {
                  const total =
                    q.consultingPrice +
                    q.testingPrice +
                    q.otherCommercials +
                    q.governmentFees;
                  return (
                    <tr key={q.id} className="border-b border-brand-line/70">
                      <td className="py-3">
                        <Link
                          href={`/quotations/${q.id}`}
                          className="font-semibold text-brand-teal"
                        >
                          {q.quoteNumber}
                        </Link>
                      </td>
                      <td>{q.company}</td>
                      <td>{q.serviceName}</td>
                      <td>{formatINR(total)}</td>
                      <td>
                        <Badge tone={statusTone(q.status)}>{q.status}</Badge>
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
