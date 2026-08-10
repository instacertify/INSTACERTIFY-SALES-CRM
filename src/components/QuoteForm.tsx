"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, INDIAN_STATES, formatINR } from "@/lib/constants";

type Template = {
  id: string;
  name: string;
  description?: string | null;
  bodyHtml: string;
  validityDays: number;
  consultingPrice: number;
  testingPrice: number;
  otherCommercials: number;
  otherCommercialsNote?: string | null;
  serviceNote?: string | null;
  bankDetailId?: string | null;
};

type Bank = {
  id: string;
  accountName: string;
  bankName: string;
  isDefault: boolean;
};

type TestingItem = {
  id: string;
  name: string;
  labName: string;
  salesPrice: number;
  purchasePrice?: number;
};

type LeadSeed = {
  id: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  state?: string | null;
};

export function QuoteForm({
  templates,
  banks,
  testingServices,
  services,
  lead,
}: {
  templates: Template[];
  banks: Bank[];
  testingServices: TestingItem[];
  services: { id: string; name: string; description?: string | null }[];
  lead?: LeadSeed | null;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const [country, setCountry] = useState(lead?.country || "India");
  const [serviceName, setServiceName] = useState(
    selectedTemplate?.serviceNote || services[0]?.name || "",
  );
  const [description, setDescription] = useState(
    selectedTemplate?.description ||
      services[0]?.description ||
      "Commercial proposal for certification consulting and related services.",
  );
  const [bodyHtml, setBodyHtml] = useState(selectedTemplate?.bodyHtml || "");
  const [consultingPrice, setConsultingPrice] = useState(
    selectedTemplate?.consultingPrice || 0,
  );
  const [testingPrice, setTestingPrice] = useState(
    selectedTemplate?.testingPrice || 0,
  );
  const [otherCommercials, setOtherCommercials] = useState(
    selectedTemplate?.otherCommercials || 0,
  );
  const [otherNote, setOtherNote] = useState(
    selectedTemplate?.otherCommercialsNote || "",
  );
  const [bankDetailId, setBankDetailId] = useState(
    selectedTemplate?.bankDetailId ||
      banks.find((b) => b.isDefault)?.id ||
      banks[0]?.id ||
      "",
  );
  const [selectedTesting, setSelectedTesting] = useState<
    { id: string; name: string; labName: string; price: number }[]
  >([]);
  const [manualTestingName, setManualTestingName] = useState("");
  const [manualTestingLab, setManualTestingLab] = useState("");
  const [manualTestingPrice, setManualTestingPrice] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setServiceName(t.serviceNote || serviceName);
    setBodyHtml(t.bodyHtml || "");
    setConsultingPrice(t.consultingPrice || 0);
    setTestingPrice(t.testingPrice || 0);
    setOtherCommercials(t.otherCommercials || 0);
    setOtherNote(t.otherCommercialsNote || "");
    if (t.bankDetailId) setBankDetailId(t.bankDetailId);
  }

  function addTestingFromLibrary(id: string) {
    const item = testingServices.find((t) => t.id === id);
    if (!item) return;
    const next = [
      ...selectedTesting,
      {
        id: item.id,
        name: item.name,
        labName: item.labName,
        price: item.salesPrice,
      },
    ];
    setSelectedTesting(next);
    setTestingPrice(next.reduce((s, i) => s + Number(i.price || 0), 0));
  }

  function addManualTesting() {
    if (!manualTestingName) return;
    const next = [
      ...selectedTesting,
      {
        id: `manual-${Date.now()}`,
        name: manualTestingName,
        labName: manualTestingLab || "Manual",
        price: Number(manualTestingPrice || 0),
      },
    ];
    setSelectedTesting(next);
    setTestingPrice(next.reduce((s, i) => s + Number(i.price || 0), 0));
    setManualTestingName("");
    setManualTestingLab("");
    setManualTestingPrice(0);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const validityDate = String(form.get("validityDate") || "");
    const payload = {
      leadId: lead?.id || null,
      templateId: templateId || null,
      customerName: String(form.get("customerName") || ""),
      company: String(form.get("company") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      country,
      state: String(form.get("state") || "") || null,
      serviceName,
      description,
      validityDate,
      consultingPrice,
      testingPrice,
      otherCommercials,
      otherCommercialsNote: otherNote,
      testingItems: selectedTesting,
      bodyHtml,
      bankDetailId: bankDetailId || null,
    };
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create quote");
      return;
    }
    router.push(`/quotes/${data.id}`);
    router.refresh();
  }

  const revenue =
    Number(consultingPrice || 0) +
    Number(testingPrice || 0) +
    Number(otherCommercials || 0);

  const defaultValidity = new Date();
  defaultValidity.setDate(
    defaultValidity.getDate() + (selectedTemplate?.validityDays || 30),
  );
  const validityValue = defaultValidity.toISOString().slice(0, 10);

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Quote template
        <select
          value={templateId}
          onChange={(e) => applyTemplate(e.target.value)}
        >
          <option value="">Blank quote</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="form-grid two">
        <label>
          Customer name
          <input
            name="customerName"
            required
            defaultValue={lead?.customerName || ""}
          />
        </label>
        <label>
          Company
          <input name="company" required defaultValue={lead?.company || ""} />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            defaultValue={lead?.email || ""}
          />
        </label>
        <label>
          Phone
          <input name="phone" required defaultValue={lead?.phone || ""} />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Country
          <select
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
            <select name="state" defaultValue={lead?.state || ""}>
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
            <input name="state" defaultValue={lead?.state || ""} />
          </label>
        )}
      </div>

      <div className="form-grid two">
        <label>
          Service
          <select
            value={serviceName}
            onChange={(e) => {
              setServiceName(e.target.value);
              const svc = services.find((s) => s.name === e.target.value);
              if (svc?.description) setDescription(svc.description);
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
            {!services.find((s) => s.name === serviceName) && serviceName ? (
              <option value={serviceName}>{serviceName}</option>
            ) : null}
          </select>
        </label>
        <label>
          Validity date
          <input type="date" name="validityDate" required defaultValue={validityValue} />
        </label>
      </div>

      <label>
        Description / scope
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>

      <label>
        Letter body (editable)
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          style={{ minHeight: 140 }}
        />
      </label>

      <div className="panel" style={{ boxShadow: "none" }}>
        <h3>Testing services library</h3>
        <p className="muted">
          Sales price and lab name are visible here. Purchase price is admin-only
          in the Testing Library. You can also override pricing manually.
        </p>
        <div className="form-grid two" style={{ marginTop: 12 }}>
          <label>
            Add from library
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addTestingFromLibrary(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Select testing service</option>
              {testingServices.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.labName} · {formatINR(t.salesPrice)}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Manual test name
              <input
                value={manualTestingName}
                onChange={(e) => setManualTestingName(e.target.value)}
              />
            </label>
            <div className="form-grid two">
              <label>
                Lab
                <input
                  value={manualTestingLab}
                  onChange={(e) => setManualTestingLab(e.target.value)}
                />
              </label>
              <label>
                Sales price
                <input
                  type="number"
                  value={manualTestingPrice}
                  onChange={(e) =>
                    setManualTestingPrice(Number(e.target.value || 0))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="btn ghost"
              onClick={addManualTesting}
            >
              Add manual testing line
            </button>
          </div>
        </div>
        {selectedTesting.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Lab</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedTesting.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`}>
                    <td>{item.name}</td>
                    <td>{item.labName}</td>
                    <td>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const next = [...selectedTesting];
                          next[idx] = {
                            ...item,
                            price: Number(e.target.value || 0),
                          };
                          setSelectedTesting(next);
                          setTestingPrice(
                            next.reduce((s, i) => s + Number(i.price || 0), 0),
                          );
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => {
                          const next = selectedTesting.filter((_, i) => i !== idx);
                          setSelectedTesting(next);
                          setTestingPrice(
                            next.reduce((s, i) => s + Number(i.price || 0), 0),
                          );
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="form-grid two">
        <label>
          Commercial consulting price
          <input
            type="number"
            value={consultingPrice}
            onChange={(e) => setConsultingPrice(Number(e.target.value || 0))}
          />
        </label>
        <label>
          Testing price
          <input
            type="number"
            value={testingPrice}
            onChange={(e) => setTestingPrice(Number(e.target.value || 0))}
          />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Other commercials (counts in revenue)
          <input
            type="number"
            value={otherCommercials}
            onChange={(e) => setOtherCommercials(Number(e.target.value || 0))}
          />
        </label>
        <label>
          Other commercials note
          <input
            value={otherNote}
            onChange={(e) => setOtherNote(e.target.value)}
          />
        </label>
      </div>

      <div className="notice">
        Total revenue on this quote: <strong>{formatINR(revenue)}</strong>
      </div>

      <label>
        Banking details
        <select
          value={bankDetailId}
          onChange={(e) => setBankDetailId(e.target.value)}
        >
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.accountName} · {b.bankName}
              {b.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn primary" disabled={loading}>
        {loading ? "Creating..." : "Create quote"}
      </button>
    </form>
  );
}
