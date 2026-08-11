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

type PO = {
  id: string;
  poNumber: string;
  description: string;
  status: string;
  total: number;
  vendor?: { name: string } | null;
  partnerLab?: { name: string } | null;
  project?: { projectNumber: string } | null;
};

type Vendor = { id: string; name: string };
type Lab = { id: string; name: string };

export default function PurchaseOrdersPage() {
  const [rows, setRows] = useState<PO[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api<PO[]>("/purchase-orders")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Vendor[]>("/vendors").then(setVendors).catch(() => undefined);
    api<Lab[]>("/catalog/labs").then(setLabs).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount") || 0);
    const taxAmount = Number(fd.get("taxAmount") || 0);
    try {
      await api("/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          description: fd.get("description"),
          amount,
          taxAmount,
          total: amount + taxAmount,
          status: "SENT",
          vendorId: fd.get("vendorId") || undefined,
          partnerLabId: fd.get("partnerLabId") || undefined,
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
        title="Purchase orders"
        subtitle="AP side — lab testing POs and vendor buys that feed testing margin."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New PO"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Description">
              <input name="description" required className={inputClass} />
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
            <Field label="Partner lab">
              <select name="partnerLabId" className={inputClass} defaultValue="">
                <option value="">—</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount ₹">
              <input name="amount" type="number" required className={inputClass} />
            </Field>
            <Field label="Tax ₹">
              <input name="taxAmount" type="number" defaultValue={0} className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Create PO</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length ? (
          <EmptyState title="No purchase orders" body="Raise a PO for lab testing or supplies." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2">PO</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Vendor / Lab</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((po) => (
                  <tr key={po.id} className="border-b border-brand-line/70">
                    <td className="py-3 font-semibold">{po.poNumber}</td>
                    <td>{po.description}</td>
                    <td>{po.vendor?.name || po.partnerLab?.name || "—"}</td>
                    <td>{formatINR(po.total)}</td>
                    <td>
                      <Badge tone={statusTone(po.status)}>{po.status}</Badge>
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
