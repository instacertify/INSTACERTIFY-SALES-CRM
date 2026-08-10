"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ReportRow = {
  id: string;
  title: string;
  status: string;
  publicUrl: string;
  originalName: string;
  sharedAt?: string;
  message?: string | null;
};

export function ReportUpload({
  quoteId,
  quoteNumber,
  canUpload,
  initialReports = [],
}: {
  quoteId: string;
  quoteNumber: string;
  canUpload: boolean;
  initialReports?: ReportRow[];
}) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [title, setTitle] = useState(`Final report — ${quoteNumber}`);
  const [message, setMessage] = useState(
    `Your report for quote ${quoteNumber} is ready. You can download it from this link.`,
  );
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [copiedId, setCopiedId] = useState("");

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setInfo("");
    const form = new FormData();
    form.append("quoteId", quoteId);
    form.append("title", title);
    form.append("message", message);
    form.append("file", file);
    const res = await fetch("/api/reports", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not upload report");
      return;
    }
    setReports((prev) => [
      {
        id: data.id,
        title: data.title,
        status: data.status,
        publicUrl: data.publicUrl,
        originalName: data.originalName,
        sharedAt: data.sharedAt,
        message: data.message,
      },
      ...prev,
    ]);
    setFile(null);
    setInfo(`Report ready. Share this link with the customer: ${data.publicUrl}`);
    router.refresh();
  }

  async function copyLink(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 1500);
  }

  async function reshare(id: string) {
    const res = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reshare" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not reshare");
      return;
    }
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, publicUrl: data.publicUrl, status: data.status, sharedAt: data.sharedAt }
          : r,
      ),
    );
    setInfo(`Report link ready to share: ${data.publicUrl}`);
  }

  if (!canUpload && !reports.length) return null;

  return (
    <div className="stack">
      {canUpload ? (
        <form className="form-grid panel" onSubmit={onUpload}>
          <h3>Upload final report</h3>
          <p className="muted">
            When the report is done, upload it here and share the customer link
            that the report is ready.
          </p>
          <label>
            Report title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            Message for customer
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your report is ready..."
            />
          </label>
          <label>
            Report file
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className="btn accent" disabled={loading}>
            {loading ? "Uploading..." : "Upload & get customer link"}
          </button>
        </form>
      ) : (
        <div className="notice">
          Accept the quote first, then upload and share the final report.
        </div>
      )}

      {reports.length ? (
        <div className="panel">
          <h3>Shared reports</h3>
          <div className="stack" style={{ marginTop: 12 }}>
            {reports.map((report) => (
              <div key={report.id} className="notice ok">
                <strong>{report.title}</strong>
                <div className="muted">
                  {report.originalName} · {report.status}
                </div>
                <div className="muted">{report.publicUrl}</div>
                <div className="row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn primary small"
                    onClick={() => copyLink(report.publicUrl, report.id)}
                  >
                    {copiedId === report.id ? "Copied" : "Copy customer link"}
                  </button>
                  <a
                    className="btn ghost small"
                    href={report.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open customer page
                  </a>
                  <a
                    className="btn ghost small"
                    href={`/api/reports/${report.id}/download`}
                  >
                    Download file
                  </a>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => reshare(report.id)}
                  >
                    Reshare
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {info ? <div className="notice ok">{info}</div> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
