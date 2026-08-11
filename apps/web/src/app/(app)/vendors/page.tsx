"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  EmptyState,
  Button,
  Field,
  inputClass,
} from "@/components/ui";

type Vendor = {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  city?: string;
  gstin?: string;
  active: boolean;
  _count: { purchaseOrders: number; expenses: number };
};

export default function VendorsPage() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api<Vendor[]>("/vendors")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api("/vendors", {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("name"),
          type: fd.get("type") || "SUPPLIER",
          email: fd.get("email") || undefined,
          phone: fd.get("phone") || undefined,
          city: fd.get("city") || undefined,
          gstin: fd.get("gstin") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Labs, couriers, consultants and suppliers for purchase orders and expenses."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New vendor"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Type">
              <select name="type" className={inputClass} defaultValue="SUPPLIER">
                <option value="LAB">Lab</option>
                <option value="COURIER">Courier</option>
                <option value="CONSULTANT">Consultant</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="City">
              <input name="city" className={inputClass} />
            </Field>
            <Field label="GSTIN">
              <input name="gstin" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length ? (
          <EmptyState title="No vendors" body="Add labs and suppliers here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">City</th>
                  <th className="py-2">POs</th>
                  <th className="py-2">Expenses</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <p className="font-semibold">{v.name}</p>
                      <p className="text-xs text-brand-grey">{v.email || v.phone}</p>
                    </td>
                    <td>{v.type}</td>
                    <td>{v.city || "—"}</td>
                    <td>{v._count.purchaseOrders}</td>
                    <td>{v._count.expenses}</td>
                    <td>
                      <Badge tone={v.active ? "green" : "neutral"}>
                        {v.active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
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
