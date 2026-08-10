"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublicQuoteActions({
  token,
  status,
  revisionMessage,
}: {
  token: string;
  status: string;
  revisionMessage?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const locked = status === "ACCEPTED";

  async function act(action: "accept" | "revise") {
    setError("");
    setInfo("");
    const res = await fetch(`/api/public/quotes/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, message }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    setInfo(
      action === "accept"
        ? "Thank you. The quote has been accepted."
        : "Revision request sent to Instacertify.",
    );
    router.refresh();
  }

  return (
    <div className="public-actions no-print">
      <button type="button" className="btn ghost" onClick={() => window.print()}>
        Print / Download PDF
      </button>
      {locked ? (
        <div className="notice ok">Quote accepted. Thank you.</div>
      ) : (
        <>
          <input
            style={{ minWidth: 260 }}
            placeholder="Remark / message for Instacertify"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="button" className="btn primary" onClick={() => act("accept")}>
            Accepted
          </button>
          <button type="button" className="btn accent" onClick={() => act("revise")}>
            Request revise
          </button>
        </>
      )}
      {revisionMessage ? (
        <div className="notice warn">Previous remark: {revisionMessage}</div>
      ) : null}
      {info ? <div className="notice ok">{info}</div> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
