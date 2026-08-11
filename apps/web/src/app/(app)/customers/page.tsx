"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  EmptyState,
  Button,
  Field,
  inputClass,
} from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Customer = {
  id: string;
  company: string;
  email: string;
  phone?: string;
  country: string;
  gstin?: string;
  lifetimeValue: number;
  _count: { projects: number; contacts: number; quotations: number };
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    api<Customer[]>(`/customers${q}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await api("/customers", {
        method: "POST",
        body: JSON.stringify({
          company: fd.get("company"),
          email: fd.get("email"),
          phone: fd.get("phone") || undefined,
          country: fd.get("country") || "India",
          state: fd.get("state") || undefined,
          city: fd.get("city") || undefined,
          gstin: fd.get("gstin") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Account master — contacts, projects, quotes, invoices and portals in one place."
        actions={
          <>
            <input
              className={`${inputClass} w-48`}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
            <Button type="button" variant="secondary" onClick={load}>
              Search
            </Button>
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Close" : "New customer"}
            </Button>
          </>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form
            onSubmit={onCreate}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Field label="Company">
              <input name="company" required className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="Country">
              <input name="country" defaultValue="India" className={inputClass} />
            </Field>
            <Field label="State">
              <input name="state" className={inputClass} />
            </Field>
            <Field label="City">
              <input name="city" className={inputClass} />
            </Field>
            <Field label="GSTIN">
              <input name="gstin" className={inputClass} />
            </Field>
            <Field label="Notes">
              <input name="notes" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create customer"}
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState
            title="No customers yet"
            body="Create a customer or convert a won lead."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2 font-semibold">Company</th>
                  <th className="py-2 font-semibold">Country</th>
                  <th className="py-2 font-semibold">Projects</th>
                  <th className="py-2 font-semibold">Contacts</th>
                  <th className="py-2 font-semibold">Lifetime value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-semibold text-brand-teal"
                      >
                        {c.company}
                      </Link>
                      <div className="text-xs text-brand-grey">{c.email}</div>
                    </td>
                    <td>{c.country}</td>
                    <td>{c._count.projects}</td>
                    <td>{c._count.contacts}</td>
                    <td>{formatINR(c.lifetimeValue)}</td>
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
