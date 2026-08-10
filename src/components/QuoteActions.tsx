"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/constants";

export function QuoteActions({
  quote,
  banks,
  services,
}: {
  quote: {
    id: string;
    status: string;
    publicUrl: string;
    publicToken: string;
    consultingPrice: number;
    testingPrice: number;
    otherCommercials: number;
    otherCommercialsNote?: string | null;
    bodyHtml: string;
    description: string;
    serviceName: string;
    validityDate: string;
    bankSnapshot: string;
    bankDetailId?: string | null;
    revisionMessage?: string | null;
    customerName: string;
    company: string;
    email: string;
    phone: string;
  };
  banks: { id: string; accountName: string; bankName: string }[];
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [docServiceId, setDocServiceId] = useState(services[0]?.id || "");
  const [questionnaire, setQuestionnaire] = useState("");

  async function patch(body: Record<string, unknown>) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Action failed");
      return null;
    }
    router.refresh();
    return data;
  }

  async function share() {
    const data = await patch({
      action: quote.status === "REVISION_REQUESTED" ? "reshare" : "share",
    });
    if (data?.publicUrl) {
      setMessage(
        quote.status === "REVISION_REQUESTED"
          ? "Revised quote reshared."
          : "Quote shared with customer link.",
      );
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(quote.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveEdits(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await patch({
      consultingPrice: Number(form.get("consultingPrice") || 0),
      testingPrice: Number(form.get("testingPrice") || 0),
      otherCommercials: Number(form.get("otherCommercials") || 0),
      otherCommercialsNote: form.get("otherCommercialsNote"),
      bodyHtml: form.get("bodyHtml"),
      description: form.get("description"),
      serviceName: form.get("serviceName"),
      validityDate: form.get("validityDate"),
      bankDetailId: form.get("bankDetailId") || null,
      bankSnapshot: form.get("bankSnapshot"),
    });
    setMessage("Quote updated.");
  }

  async function saveTemplate() {
    const name = window.prompt("Template name", `${quote.serviceName} Template`);
    if (!name) return;
    await patch({ action: "saveAsTemplate", name });
    setMessage("Template saved for everyone.");
  }

  async function shareDocuments(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/documents/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteId: quote.id,
        serviceId: docServiceId,
        questionnaire,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not share documents");
      return;
    }
    setMessage(`Document checklist shared: ${data.publicUrl}`);
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn accent" onClick={share}>
          {quote.status === "REVISION_REQUESTED"
            ? "Reshare quote link"
            : "Share quote link"}
        </button>
        <button type="button" className="btn primary" onClick={copyLink}>
          {copied ? "Copied" : "Copy customer link"}
        </button>
        <button type="button" className="btn ghost" onClick={saveTemplate}>
          Save as template
        </button>
        <a
          className="btn ghost"
          href={quote.publicUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open public quote
        </a>
      </div>

      {quote.revisionMessage ? (
        <div className="notice warn">
          <strong>Customer revision remark</strong>
          <p>{quote.revisionMessage}</p>
        </div>
      ) : null}

      <form className="form-grid panel" onSubmit={saveEdits}>
        <h3>Edit quote (creator editable)</h3>
        <div className="form-grid two">
          <label>
            Service
            <input name="serviceName" defaultValue={quote.serviceName} />
          </label>
          <label>
            Validity
            <input
              type="date"
              name="validityDate"
              defaultValue={quote.validityDate.slice(0, 10)}
            />
          </label>
        </div>
        <label>
          Description
          <textarea name="description" defaultValue={quote.description} />
        </label>
        <label>
          Letter body
          <textarea name="bodyHtml" defaultValue={quote.bodyHtml} />
        </label>
        <div className="form-grid two">
          <label>
            Consulting price
            <input
              type="number"
              name="consultingPrice"
              defaultValue={quote.consultingPrice}
            />
          </label>
          <label>
            Testing price
            <input
              type="number"
              name="testingPrice"
              defaultValue={quote.testingPrice}
            />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Other commercials
            <input
              type="number"
              name="otherCommercials"
              defaultValue={quote.otherCommercials}
            />
          </label>
          <label>
            Other commercials note
            <input
              name="otherCommercialsNote"
              defaultValue={quote.otherCommercialsNote || ""}
            />
          </label>
        </div>
        <label>
          Bank profile
          <select
            name="bankDetailId"
            defaultValue={quote.bankDetailId || ""}
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.accountName} · {b.bankName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Banking text on this quote
          <textarea name="bankSnapshot" defaultValue={quote.bankSnapshot} />
        </label>
        <div className="notice">
          Revenue:{" "}
          <strong>
            {formatINR(
              Number(quote.consultingPrice) +
                Number(quote.testingPrice) +
                Number(quote.otherCommercials),
            )}
          </strong>
        </div>
        <button className="btn primary">Save quote edits</button>
      </form>

      {quote.status === "ACCEPTED" ? (
        <form className="form-grid panel" onSubmit={shareDocuments}>
          <h3>Share document list with customer</h3>
          <p className="muted">
            Select a service document library checklist. Customer receives a link
            with quote number and upload options.
          </p>
          <label>
            Service document library
            <select
              value={docServiceId}
              onChange={(e) => setDocServiceId(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Questionnaire / remarks for customer
            <textarea
              value={questionnaire}
              onChange={(e) => setQuestionnaire(e.target.value)}
              placeholder="Any questions the customer should answer while uploading"
            />
          </label>
          <button className="btn accent">Share document checklist link</button>
        </form>
      ) : null}

      {message ? <div className="notice ok">{message}</div> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="muted">Public URL: {quote.publicUrl}</div>
    </div>
  );
}
