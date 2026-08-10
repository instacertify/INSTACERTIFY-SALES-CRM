"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/ui";

type Template = {
  id: string;
  name: string;
  description?: string | null;
  bodyHtml: string;
  serviceNote?: string | null;
  consultingPrice: number;
  testingPrice: number;
  otherCommercials: number;
  otherCommercialsNote?: string | null;
  validityDays: number;
  bankDetailId?: string | null;
  createdBy: { name: string };
};

type Bank = { id: string; accountName: string; bankName: string };
type SessionUser = { role: string };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [role, setRole] = useState("SALES_OPS");
  const [selected, setSelected] = useState<Template | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const [tRes, bRes, me] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/admin/banks"),
      fetch("/api/auth/session"),
    ]);
    setTemplates(await tRes.json());
    setBanks(await bRes.json());
    const session = (await me.json()) as { user?: SessionUser };
    if (session.user?.role) setRole(session.user.role);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: form.get("name"),
      description: form.get("description"),
      bodyHtml: form.get("bodyHtml"),
      serviceNote: form.get("serviceNote"),
      consultingPrice: Number(form.get("consultingPrice") || 0),
      testingPrice: Number(form.get("testingPrice") || 0),
      otherCommercials: Number(form.get("otherCommercials") || 0),
      otherCommercialsNote: form.get("otherCommercialsNote"),
      validityDays: Number(form.get("validityDays") || 30),
    };
    if (role === "ADMIN") {
      payload.bankDetailId = form.get("bankDetailId") || null;
    }
    const res = await fetch(`/api/templates/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Save failed");
      return;
    }
    setMessage("Template updated.");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Quote templates"
        subtitle="Anyone can edit formatting and commercials. Bank details on templates are admin-only."
      />
      <Panel>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Service</th>
                <th>Created by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.serviceNote || "—"}</td>
                  <td>{t.createdBy.name}</td>
                  <td>
                    <button
                      className="btn ghost small"
                      onClick={() => setSelected(t)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected ? (
        <Panel>
          <form className="form-grid" onSubmit={save}>
            <h2>Edit template</h2>
            <label>
              Name
              <input name="name" defaultValue={selected.name} required />
            </label>
            <label>
              Service note
              <input
                name="serviceNote"
                defaultValue={selected.serviceNote || ""}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={selected.description || ""}
              />
            </label>
            <label>
              Body HTML / formatting
              <textarea name="bodyHtml" defaultValue={selected.bodyHtml} />
            </label>
            <div className="form-grid two">
              <label>
                Consulting
                <input
                  type="number"
                  name="consultingPrice"
                  defaultValue={selected.consultingPrice}
                />
              </label>
              <label>
                Testing
                <input
                  type="number"
                  name="testingPrice"
                  defaultValue={selected.testingPrice}
                />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Other commercials
                <input
                  type="number"
                  name="otherCommercials"
                  defaultValue={selected.otherCommercials}
                />
              </label>
              <label>
                Validity days
                <input
                  type="number"
                  name="validityDays"
                  defaultValue={selected.validityDays}
                />
              </label>
            </div>
            <label>
              Other commercials note
              <input
                name="otherCommercialsNote"
                defaultValue={selected.otherCommercialsNote || ""}
              />
            </label>
            {role === "ADMIN" ? (
              <label>
                Bank details (admin only)
                <select
                  name="bankDetailId"
                  defaultValue={selected.bankDetailId || ""}
                >
                  <option value="">None</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName} · {b.bankName}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="notice">
                Bank details on templates can only be edited by admin.
              </div>
            )}
            <button className="btn primary">Save template</button>
          </form>
          {message ? <div className="notice ok">{message}</div> : null}
        </Panel>
      ) : null}
    </div>
  );
}
