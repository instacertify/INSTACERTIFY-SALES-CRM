"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  statusTone,
  EmptyState,
  Button,
  Field,
  inputClass,
} from "@/components/ui";

type Sample = {
  id: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
  dispatchedAt?: string;
  receivedAt?: string;
  project: { id: string; projectNumber: string; title: string };
  partnerLab?: { name: string } | null;
};

type Project = { id: string; projectNumber: string; title: string };
type Lab = { id: string; name: string };

export default function SamplesPage() {
  const [rows, setRows] = useState<Sample[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api<Sample[]>("/samples")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Project[]>("/projects").then(setProjects).catch(() => undefined);
    api<Lab[]>("/catalog/labs").then(setLabs).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api("/samples", {
        method: "POST",
        body: JSON.stringify({
          projectId: fd.get("projectId"),
          trackingNumber: fd.get("trackingNumber") || undefined,
          carrier: fd.get("carrier") || undefined,
          status: fd.get("status") || "PENDING",
          partnerLabId: fd.get("partnerLabId") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await api(`/samples/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(status === "DISPATCHED"
            ? { dispatchedAt: new Date().toISOString() }
            : {}),
          ...(status === "RECEIVED"
            ? { receivedAt: new Date().toISOString() }
            : {}),
        }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Samples"
        subtitle="Track sample dispatch to labs — pending, in transit, received, returned."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "Log shipment"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Project">
              <select name="projectId" required className={inputClass}>
                <option value="">Select…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectNumber} — {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lab">
              <select name="partnerLabId" className={inputClass} defaultValue="">
                <option value="">—</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Carrier">
              <input name="carrier" className={inputClass} />
            </Field>
            <Field label="Tracking #">
              <input name="trackingNumber" className={inputClass} />
            </Field>
            <Field label="Status">
              <select name="status" className={inputClass} defaultValue="PENDING">
                {["PENDING", "DISPATCHED", "IN_TRANSIT", "RECEIVED", "RETURNED"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <div className="flex items-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length ? (
          <EmptyState title="No sample shipments" body="Log the first sample to a lab." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2">Project</th>
                  <th className="py-2">Lab</th>
                  <th className="py-2">Tracking</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Update</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <p className="font-semibold">{s.project.projectNumber}</p>
                      <p className="text-xs text-brand-grey">{s.project.title}</p>
                    </td>
                    <td>{s.partnerLab?.name || "—"}</td>
                    <td>
                      {s.carrier || "—"} {s.trackingNumber || ""}
                    </td>
                    <td>
                      <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                    </td>
                    <td>
                      <select
                        className={inputClass}
                        value={s.status}
                        onChange={(e) => setStatus(s.id, e.target.value)}
                      >
                        {[
                          "PENDING",
                          "DISPATCHED",
                          "IN_TRANSIT",
                          "RECEIVED",
                          "RETURNED",
                          "LOST",
                        ].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
