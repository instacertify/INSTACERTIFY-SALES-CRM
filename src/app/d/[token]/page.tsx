"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";

type DocItem = { id: string; name: string; description?: string | null; required: boolean };
type Upload = {
  id: string;
  originalName: string;
  remark?: string | null;
  libraryItem?: string | null;
};

type Payload = {
  quoteNumber: string;
  company: string;
  customerName: string;
  serviceName: string;
  status: string;
  questionnaire?: string | null;
  teamRemark?: string | null;
  documents: DocItem[];
  uploads: Upload[];
};

export default function PublicDocumentsPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<Payload | null>(null);
  const [libraryItemId, setLibraryItemId] = useState("");
  const [remark, setRemark] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/public/documents/${token}`);
    if (!res.ok) {
      setError("Document link not found");
      return;
    }
    const json = await res.json();
    setData(json);
    setLibraryItemId(json.documents?.[0]?.id || "");
  }

  useEffect(() => {
    load();
  }, [token]);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("libraryItemId", libraryItemId);
    form.append("remark", remark);
    const res = await fetch(`/api/public/documents/${token}`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Upload failed");
      return;
    }
    setMessage("File uploaded.");
    setFile(null);
    setRemark("");
    load();
  }

  async function finalize() {
    const res = await fetch(`/api/public/documents/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finalize", note: remark }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not finalize");
      return;
    }
    setMessage("Marked as final. Instacertify team has been notified.");
    load();
  }

  if (error && !data) {
    return (
      <div style={{ padding: 40 }}>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40 }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px" }}>
      <div className="panel">
        <BrandMark size="md" />
        <h1 style={{ marginTop: 16 }}>Document checklist</h1>
        <p className="muted">
          Quote <strong>{data.quoteNumber}</strong> · {data.company} ·{" "}
          {data.serviceName}
        </p>
        {data.questionnaire ? (
          <div className="notice" style={{ marginTop: 12 }}>
            <strong>Questionnaire / remarks</strong>
            <p>{data.questionnaire}</p>
          </div>
        ) : null}
        {data.teamRemark ? (
          <div className="notice warn" style={{ marginTop: 12 }}>
            <strong>Update from Instacertify</strong>
            <p>{data.teamRemark}</p>
          </div>
        ) : null}

        <h3 style={{ marginTop: 20 }}>Required documents</h3>
        <ul>
          {data.documents.map((d) => (
            <li key={d.id}>
              {d.name}
              {d.required ? " *" : ""}
              {d.description ? ` — ${d.description}` : ""}
            </li>
          ))}
        </ul>

        <form className="form-grid" onSubmit={upload} style={{ marginTop: 16 }}>
          <label>
            Document type
            <select
              value={libraryItemId}
              onChange={(e) => setLibraryItemId(e.target.value)}
            >
              {data.documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Upload file
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </label>
          <label>
            Remark / answer
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional remark or questionnaire answer"
            />
          </label>
          <button className="btn primary">Upload document</button>
        </form>

        <div className="stack" style={{ marginTop: 18 }}>
          <h3>Uploaded</h3>
          {data.uploads.map((u) => (
            <div key={u.id} className="notice">
              <strong>{u.originalName}</strong>
              <div className="muted">{u.libraryItem}</div>
              {u.remark ? <div>{u.remark}</div> : null}
            </div>
          ))}
          {!data.uploads.length ? (
            <p className="muted">No uploads yet.</p>
          ) : null}
        </div>

        {data.status !== "FINAL" ? (
          <button
            type="button"
            className="btn accent"
            style={{ marginTop: 16 }}
            onClick={finalize}
          >
            Confirm this is final
          </button>
        ) : (
          <div className="notice ok" style={{ marginTop: 16 }}>
            Submission marked final.
          </div>
        )}
        {message ? <div className="notice ok">{message}</div> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
