"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";

type RequestRow = {
  id: string;
  status: string;
  publicUrl: string;
  teamRemark?: string | null;
  questionnaire?: string | null;
  quote: { quoteNumber: string; company: string; id: string };
  service: { name: string };
  uploads: { id: string; originalName: string }[];
};

export default function DocumentsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [remark, setRemark] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/documents/requests");
    const data = await res.json();
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function requestMore(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const res = await fetch(`/api/documents/requests/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "requestMore", teamRemark: remark }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed");
      return;
    }
    setMessage("Customer notified that something is missing/extra.");
    setRemark("");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Document library & uploads"
        subtitle="Share service checklists after quote acceptance, download customer files, and request missing items."
      />
      <Panel>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Company</th>
                <th>Service</th>
                <th>Status</th>
                <th>Files</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.quote.quoteNumber}</td>
                  <td>{row.quote.company}</td>
                  <td>{row.service.name}</td>
                  <td>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td>{row.uploads.length}</td>
                  <td>
                    <button
                      className="btn ghost small"
                      onClick={() => setSelected(row)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No document requests yet. Share one from an accepted quote.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected ? (
        <Panel>
          <h2>
            {selected.quote.quoteNumber} · {selected.service.name}
          </h2>
          <p className="muted">Customer link: {selected.publicUrl}</p>
          <div className="stack" style={{ marginTop: 12 }}>
            {selected.uploads.map((u) => (
              <div key={u.id} className="row">
                <span>{u.originalName}</span>
                <a
                  className="btn ghost small"
                  href={`/api/documents/uploads/${u.id}/download`}
                >
                  Download
                </a>
              </div>
            ))}
            {!selected.uploads.length ? (
              <p className="muted">No files uploaded yet.</p>
            ) : null}
          </div>
          <form className="form-grid" style={{ marginTop: 16 }} onSubmit={requestMore}>
            <label>
              Notify customer — missing / extra / remarks
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                required
              />
            </label>
            <button className="btn accent">Notify customer</button>
          </form>
          {message ? <div className="notice ok">{message}</div> : null}
        </Panel>
      ) : null}
    </div>
  );
}
