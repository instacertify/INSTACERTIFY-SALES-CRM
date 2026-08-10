"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type ProjectDetail = {
  id: string;
  projectNumber: string;
  title: string;
  company: string;
  status: string;
  serviceName?: string | null;
  serviceType?: string | null;
  projectValue: number;
  consultingFees: number;
  testingFees: number;
  governmentFees: number;
  paymentStatus: string;
  waitingFor?: string | null;
  waitingNote?: string | null;
  scopeSummary?: string | null;
  commercialOwner?: { name: string } | null;
  deliveryOwner?: { name: string } | null;
  products: Array<{ id: string; name: string; modelNumber?: string | null; brand?: string | null }>;
  manufacturers: Array<{ id: string; name: string; country?: string | null }>;
  applicants: Array<{ id: string; name: string; type: string }>;
  standards: Array<{ id: string; code: string; name: string; authority?: string | null }>;
  tasks: Array<{ id: string; title: string; status: string; waitingFor?: string | null; assignedTo?: { name: string } | null }>;
  testingOrders: Array<{ id: string; testName: string; status: string; partnerLab?: { name: string } | null }>;
  sampleShipments: Array<{ id: string; trackingNumber?: string | null; status: string; carrier?: string | null }>;
  certifications: Array<{ id: string; authority?: string | null; status: string; certificateNo?: string | null }>;
  remarks: Array<{ id: string; stage: string; remark: string; createdBy?: { name: string } | null }>;
};

const STATUSES = [
  "NOT_STARTED",
  "QUOTED",
  "ACCEPTED",
  "DOCUMENTS_PENDING",
  "DOCUMENTS_COMPLETE",
  "SAMPLE_PENDING",
  "TESTING",
  "APPLICATION",
  "AUTHORITY_PENDING",
  "CLIENT_ACTION",
  "CERTIFICATION",
  "DELIVERY",
  "COMPLETED",
  "CLOSED",
  "LOST",
];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const row = await api<ProjectDetail>(`/projects/${params.id}`);
    setData(row);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.id]);

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      await api(`/projects/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: form.get("status"),
          waitingFor: form.get("waitingFor") || null,
          waitingNote: form.get("waitingNote") || null,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function addRemark(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api(`/projects/${params.id}/remarks`, {
      method: "POST",
      body: JSON.stringify({
        stage: form.get("stage") || "Other",
        remark: form.get("remark"),
      }),
    });
    (e.target as HTMLFormElement).reset();
    await load();
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-brand-grey">Loading project…</p>;

  return (
    <div>
      <PageHeader
        title={data.projectNumber}
        subtitle={`${data.company} · ${data.serviceType || "Service"} · ${data.title}`}
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(data.status)}>{data.status}</Badge>
            <Badge tone="orange">Pay: {data.paymentStatus}</Badge>
          </div>
          <p className="mt-3 text-sm text-brand-grey">{data.scopeSummary}</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p>Commercial: {data.commercialOwner?.name || "—"}</p>
            <p>Delivery: {data.deliveryOwner?.name || "—"}</p>
            <p>Project value: {formatINR(data.projectValue)}</p>
            <p>
              Fees: C {formatINR(data.consultingFees)} · T{" "}
              {formatINR(data.testingFees)} · G {formatINR(data.governmentFees)}
            </p>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Update status</h2>
          <form className="mt-3 space-y-3" onSubmit={onUpdate}>
            <label className="block text-sm font-semibold">
              Status
              <select
                name="status"
                defaultValue={data.status}
                className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Waiting for
              <input
                name="waitingFor"
                defaultValue={data.waitingFor || ""}
                className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2"
              />
            </label>
            <label className="block text-sm font-semibold">
              Waiting note
              <textarea
                name="waitingNote"
                defaultValue={data.waitingNote || ""}
                className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2"
              />
            </label>
            <button
              disabled={saving}
              className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel>
          <h3 className="font-semibold">Products</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {data.products.map((p) => (
              <li key={p.id}>
                {p.name} {p.modelNumber ? `· ${p.modelNumber}` : ""}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Manufacturer / Applicant</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {data.manufacturers.map((m) => (
              <li key={m.id}>
                Mfg: {m.name} ({m.country || "—"})
              </li>
            ))}
            {data.applicants.map((a) => (
              <li key={a.id}>
                App: {a.name} ({a.type})
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Standards</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {data.standards.map((s) => (
              <li key={s.id}>
                {s.code} · {s.authority || s.name}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h3 className="font-semibold">Tasks</h3>
          <div className="mt-2 space-y-2">
            {data.tasks.map((t) => (
              <div key={t.id} className="rounded-xl bg-brand-soft/50 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{t.title}</span>
                  <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                </div>
                <p className="text-xs text-brand-grey">
                  {t.assignedTo?.name || "Unassigned"}
                  {t.waitingFor ? ` · waiting ${t.waitingFor}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Testing & samples</h3>
          <div className="mt-2 space-y-2 text-sm">
            {data.testingOrders.map((t) => (
              <div key={t.id} className="rounded-xl border border-brand-line px-3 py-2">
                {t.testName} · {t.partnerLab?.name || "Lab TBD"} · {t.status}
              </div>
            ))}
            {data.sampleShipments.map((s) => (
              <div key={s.id} className="rounded-xl border border-brand-line px-3 py-2">
                Sample {s.trackingNumber || "—"} · {s.carrier || "—"} · {s.status}
              </div>
            ))}
            {data.certifications.map((c) => (
              <div key={c.id} className="rounded-xl border border-brand-line px-3 py-2">
                Cert {c.authority || "—"} · {c.status} · {c.certificateNo || "pending"}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <h3 className="font-semibold">Remarks</h3>
        <form className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]" onSubmit={addRemark}>
          <input
            name="stage"
            placeholder="Stage"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm"
          />
          <input
            name="remark"
            required
            placeholder="Add project remark"
            className="rounded-xl border border-brand-line px-3 py-2 text-sm"
          />
          <button className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white">
            Add
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {data.remarks.map((r) => (
            <div key={r.id} className="rounded-xl bg-brand-soft/40 px-3 py-2 text-sm">
              <strong>{r.stage}</strong> · {r.createdBy?.name}
              <p>{r.remark}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
