"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Journey = {
  timeline: Array<{
    at: string;
    type: string;
    quoteNumber: string;
    quotationId: string;
    detail: string;
  }>;
  quotations: Array<{
    id: string;
    quoteNumber: string;
    status: string;
    sharedAt?: string | null;
    revisionCount: number;
    testingOptedAt?: string | null;
    acceptedAt?: string | null;
    testingLines: Array<{ title: string; amount: number }>;
  }>;
};

type CustomerDetail = {
  id: string;
  company: string;
  legalName?: string | null;
  email: string;
  phone?: string | null;
  country: string;
  lifetimeValue: number;
  contacts: Array<{
    id: string;
    name: string;
    email?: string | null;
    title?: string | null;
    isPrimary: boolean;
  }>;
  projects: Array<{
    id: string;
    projectNumber: string;
    title: string;
    status: string;
    serviceName?: string | null;
    projectValue: number;
    testingOrders?: Array<{ testName: string; status: string; salesPrice: number }>;
  }>;
  documentRequests: Array<{
    id: string;
    title: string;
    status: string;
    publicToken: string;
    items: Array<{ name: string; status: string }>;
  }>;
  testRequestForms: Array<{
    id: string;
    status: string;
    publicToken: string;
    productName?: string | null;
    testScope?: string | null;
  }>;
  workLibrary: Array<{
    id: string;
    title: string;
    category: string;
    summary: string;
    valueAmount: number;
  }>;
};

type Service = { id: string; name: string };

const API_PUBLIC =
  typeof window !== "undefined"
    ? `${window.location.origin}`
    : "http://localhost:3000";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [c, j, s] = await Promise.all([
      api<CustomerDetail>(`/customers/${params.id}`),
      api<Journey>(`/customers/${params.id}/journey`),
      api<Service[]>("/catalog/services"),
    ]);
    setData(c);
    setJourney(j);
    setServices(s);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.id]);

  async function shareChecklist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const created = await api<{ publicToken: string }>("/document-requests", {
      method: "POST",
      body: JSON.stringify({
        customerId: params.id,
        serviceOfferingId: form.get("serviceOfferingId"),
        title: form.get("title") || undefined,
      }),
    });
    setMsg(`Checklist link: ${API_PUBLIC}/portal/docs/${created.publicToken}`);
    await load();
  }

  async function shareTestRequest() {
    const created = await api<{ publicToken: string }>("/test-requests", {
      method: "POST",
      body: JSON.stringify({
        customerId: params.id,
        testScope: "As per opted testing services",
      }),
    });
    setMsg(
      `Test request link: ${API_PUBLIC}/portal/test-request/${created.publicToken}`,
    );
    await load();
  }

  async function downloadTestRequest(id: string) {
    const token = localStorage.getItem("ic_token");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/test-requests/${id}/download`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      setError("Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-request-${id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-brand-grey">Loading customer…</p>;

  return (
    <div>
      <PageHeader
        title={data.company}
        subtitle={data.legalName || data.email}
      />
      {msg ? (
        <div className="mb-4 rounded-xl border border-brand-teal/30 bg-brand-teal/5 px-3 py-2 text-sm">
          {msg}
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <div className="mt-3 space-y-1 text-sm">
            <p>Email: {data.email}</p>
            <p>Phone: {data.phone || "—"}</p>
            <p>Country: {data.country}</p>
            <p>Lifetime value: {formatINR(data.lifetimeValue)}</p>
          </div>
          <h3 className="mt-4 font-semibold">Contacts</h3>
          <div className="mt-2 space-y-2">
            {data.contacts.map((c) => (
              <div key={c.id} className="rounded-xl bg-brand-soft/50 px-3 py-2 text-sm">
                <strong>{c.name}</strong>{" "}
                {c.isPrimary ? <Badge tone="teal">Primary</Badge> : null}
                <div className="text-brand-grey">
                  {c.title || "Contact"} · {c.email || "—"}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-lg font-semibold">
            Customer journey
          </h2>
          <p className="mt-1 text-xs text-brand-grey">
            Quotes shared → revised → testing opted → accepted
          </p>
          <div className="mt-4 space-y-3">
            {(journey?.timeline || []).map((t, i) => (
              <div key={`${t.type}-${i}`} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                <div>
                  <p className="font-semibold">
                    {t.type.replaceAll("_", " ")} · {t.quoteNumber}
                  </p>
                  <p className="text-brand-grey">{t.detail}</p>
                  <p className="text-xs text-brand-grey">
                    {new Date(t.at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {!journey?.timeline?.length ? (
              <p className="text-sm text-brand-grey">No journey events yet.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel className="mb-4">
        <h2 className="font-display text-lg font-semibold">
          Quotes & testing opted
        </h2>
        <div className="mt-3 space-y-3">
          {(journey?.quotations || []).map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-brand-line px-3 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href="/quotations" className="font-semibold text-brand-teal">
                  {q.quoteNumber}
                </Link>
                <Badge tone={statusTone(q.status)}>{q.status}</Badge>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-brand-grey sm:grid-cols-2">
                <span>Shared: {q.sharedAt ? new Date(q.sharedAt).toLocaleDateString() : "—"}</span>
                <span>Revisions: {q.revisionCount}</span>
                <span>
                  Testing opted:{" "}
                  {q.testingOptedAt
                    ? new Date(q.testingOptedAt).toLocaleDateString()
                    : "—"}
                </span>
                <span>
                  Accepted:{" "}
                  {q.acceptedAt
                    ? new Date(q.acceptedAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              {q.testingLines?.length ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase text-brand-grey">
                    Testing services
                  </p>
                  <ul className="mt-1 space-y-1">
                    {q.testingLines.map((l, idx) => (
                      <li key={idx}>
                        {l.title} · {formatINR(l.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-lg font-semibold">
            Document checklist
          </h2>
          <form onSubmit={shareChecklist} className="mt-3 grid gap-2">
            <select
              name="serviceOfferingId"
              required
              className="rounded-xl border border-brand-line px-3 py-2 text-sm"
            >
              <option value="">Service for checklist</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              name="title"
              placeholder="Checklist title (optional)"
              className="rounded-xl border border-brand-line px-3 py-2 text-sm"
            />
            <button className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white">
              Share checklist with customer
            </button>
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {data.documentRequests.map((r) => (
              <div key={r.id} className="rounded-xl bg-brand-soft/50 px-3 py-2">
                <div className="flex justify-between gap-2">
                  <strong>{r.title}</strong>
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                </div>
                <p className="text-xs text-brand-grey">
                  {r.items.filter((i) => i.status === "UPLOADED").length}/
                  {r.items.length} uploaded
                </p>
                <a
                  className="text-xs text-brand-teal"
                  href={`/portal/docs/${r.publicToken}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open portal link
                </a>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-lg font-semibold">
            Test request forms
          </h2>
          <button
            type="button"
            onClick={shareTestRequest}
            className="mt-3 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white"
          >
            Ask customer to fill test request
          </button>
          <div className="mt-4 space-y-2 text-sm">
            {data.testRequestForms.map((t) => (
              <div key={t.id} className="rounded-xl border border-brand-line px-3 py-2">
                <div className="flex justify-between gap-2">
                  <strong>{t.productName || "Test request"}</strong>
                  <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                </div>
                <p className="text-xs text-brand-grey">{t.testScope || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    className="text-xs text-brand-teal"
                    href={`/portal/test-request/${t.publicToken}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Portal link
                  </a>
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-orange"
                    onClick={() => downloadTestRequest(t.id)}
                  >
                    Download for lab
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mb-4">
        <h2 className="font-display text-lg font-semibold">Projects</h2>
        <div className="mt-3 space-y-2">
          {data.projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block rounded-xl border border-brand-line px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.projectNumber}</p>
                  <p className="text-sm text-brand-grey">
                    {p.serviceName || p.title} · {formatINR(p.projectValue)}
                  </p>
                  {p.testingOrders?.length ? (
                    <p className="text-xs text-brand-orange">
                      Testing:{" "}
                      {p.testingOrders
                        .map((t) => `${t.testName} (${t.status})`)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Work library</h2>
          <Link href="/work-library" className="text-sm text-brand-teal">
            Open library
          </Link>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {data.workLibrary.map((w) => (
            <div key={w.id} className="rounded-xl bg-brand-soft/40 px-3 py-2">
              <div className="flex justify-between gap-2">
                <strong>{w.title}</strong>
                <Badge tone={statusTone(w.category)}>{w.category}</Badge>
              </div>
              <p>{w.summary}</p>
              <p className="text-xs text-brand-grey">{formatINR(w.valueAmount)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
