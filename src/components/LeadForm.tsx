"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COMPANY_SIZES,
  COUNTRIES,
  INDIAN_STATES,
  LEAD_STATUSES,
} from "@/lib/constants";

type Source = { id: string; name: string; active: boolean };
type UserOption = { id: string; name: string; email: string };

export function LeadForm({
  sources,
  users = [],
  initial,
}: {
  sources: Source[];
  users?: UserOption[];
  initial?: {
    id?: string;
    customerName?: string;
    company?: string;
    companySize?: string;
    email?: string;
    phone?: string;
    country?: string;
    state?: string | null;
    leadSourceId?: string;
    notes?: string | null;
    followUpAt?: string | null;
    product?: string | null;
    serviceName?: string | null;
    expectedValue?: number | null;
    expectedClose?: string | null;
    assignedToId?: string | null;
    status?: string | null;
  };
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initial?.country || "India");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activeSources = useMemo(
    () => sources.filter((s) => s.active || s.id === initial?.leadSourceId),
    [sources, initial?.leadSourceId],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      customerName: String(form.get("customerName") || ""),
      company: String(form.get("company") || ""),
      companySize: String(form.get("companySize") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      country: String(form.get("country") || ""),
      state: String(form.get("state") || "") || null,
      leadSourceId: String(form.get("leadSourceId") || ""),
      notes: String(form.get("notes") || "") || null,
      followUpAt: String(form.get("followUpAt") || "") || null,
      product: String(form.get("product") || "") || null,
      serviceName: String(form.get("serviceName") || "") || null,
      expectedValue: Number(form.get("expectedValue") || 0),
      expectedClose: String(form.get("expectedClose") || "") || null,
      assignedToId: String(form.get("assignedToId") || "") || null,
      status: String(form.get("status") || "NEW"),
    };

    const res = await fetch(initial?.id ? `/api/leads/${initial.id}` : "/api/leads", {
      method: initial?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not save lead");
      return;
    }
    router.push(`/leads/${data.id}`);
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="form-grid two">
        <label>
          Customer name
          <input
            name="customerName"
            required
            defaultValue={initial?.customerName || ""}
          />
        </label>
        <label>
          Company
          <input name="company" required defaultValue={initial?.company || ""} />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Company size
          <select
            name="companySize"
            required
            defaultValue={initial?.companySize || "SMALL"}
          >
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lead source
          <select
            name="leadSourceId"
            required
            defaultValue={initial?.leadSourceId || activeSources[0]?.id || ""}
          >
            {activeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            defaultValue={initial?.email || ""}
          />
        </label>
        <label>
          Phone number
          <input name="phone" required defaultValue={initial?.phone || ""} />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Country
          <select
            name="country"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {country === "India" ? (
          <label>
            State
            <select name="state" required defaultValue={initial?.state || ""}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            State / Region
            <input name="state" defaultValue={initial?.state || ""} />
          </label>
        )}
      </div>
      <div className="form-grid two">
        <label>
          Product
          <input name="product" defaultValue={initial?.product || ""} />
        </label>
        <label>
          Service
          <input name="serviceName" defaultValue={initial?.serviceName || ""} />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Expected value (INR)
          <input
            type="number"
            name="expectedValue"
            min="0"
            step="1"
            defaultValue={initial?.expectedValue ?? 0}
          />
        </label>
        <label>
          Expected close
          <input
            type="date"
            name="expectedClose"
            defaultValue={initial?.expectedClose || ""}
          />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Status
          <select name="status" defaultValue={initial?.status || "NEW"}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assigned to
          <select
            name="assignedToId"
            defaultValue={initial?.assignedToId || users[0]?.id || ""}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Follow-up reminder
        <input
          type="datetime-local"
          name="followUpAt"
          defaultValue={initial?.followUpAt || ""}
        />
      </label>
      <label>
        Notes
        <textarea name="notes" defaultValue={initial?.notes || ""} />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn primary" disabled={loading}>
        {loading ? "Saving..." : initial?.id ? "Update lead" : "Save lead"}
      </button>
    </form>
  );
}
