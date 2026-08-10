"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUSES } from "@/lib/constants";

export function LeadOperations({
  leadId,
  status,
  followUpAt,
  lastContactAt,
}: {
  leadId: string;
  status: string;
  followUpAt?: string | null;
  lastContactAt?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: form.get("status"),
        followUpAt: form.get("followUpAt") || null,
        lastContactAt: form.get("lastContactAt") || null,
        logMessage: form.get("logMessage") || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not update");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={save}>
      <div className="form-grid two">
        <label>
          Lead status
          <select name="status" defaultValue={status}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Follow-up reminder
          <input
            type="datetime-local"
            name="followUpAt"
            defaultValue={followUpAt || ""}
          />
        </label>
      </div>
      <label>
        Last contact
        <input
          type="datetime-local"
          name="lastContactAt"
          defaultValue={lastContactAt || ""}
        />
      </label>
      <label>
        Conversation log
        <textarea
          name="logMessage"
          placeholder="What was discussed in the last conversation?"
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn primary" disabled={loading}>
        {loading ? "Saving..." : "Update operations"}
      </button>
    </form>
  );
}
