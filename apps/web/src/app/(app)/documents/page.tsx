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

type Doc = {
  id: string;
  name: string;
  category: string;
  originalName: string;
  status: string;
  createdAt: string;
  customer?: { company: string } | null;
  project?: { projectNumber: string } | null;
};

type Customer = { id: string; company: string };
type Project = { id: string; projectNumber: string; title: string };

export default function DocumentsPage() {
  const [rows, setRows] = useState<Doc[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api<Doc[]>("/documents")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<Customer[]>("/customers").then(setCustomers).catch(() => undefined);
    api<Project[]>("/projects").then(setProjects).catch(() => undefined);
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "");
    try {
      await api("/documents", {
        method: "POST",
        body: JSON.stringify({
          name,
          originalName: name,
          storedName: name.replace(/\s+/g, "_").toLowerCase(),
          category: fd.get("category") || "GENERAL",
          status: "UPLOADED",
          customerId: fd.get("customerId") || undefined,
          projectId: fd.get("projectId") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Central library of manufacturer, test report, application and certificate files."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "Register document"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name / file">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Category">
              <select name="category" className={inputClass} defaultValue="GENERAL">
                {[
                  "GENERAL",
                  "MANUFACTURER",
                  "APPLICANT",
                  "TEST_REPORT",
                  "APPLICATION",
                  "CERTIFICATE",
                  "INVOICE",
                  "OTHER",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Customer">
              <select name="customerId" className={inputClass} defaultValue="">
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project">
              <select name="projectId" className={inputClass} defaultValue="">
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <input name="notes" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length ? (
          <EmptyState title="No documents" body="Register files linked to customers or projects." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Project</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-brand-line/70">
                    <td className="py-3 font-semibold">{d.name}</td>
                    <td>{d.category}</td>
                    <td>{d.customer?.company || "—"}</td>
                    <td>{d.project?.projectNumber || "—"}</td>
                    <td>
                      <Badge tone={statusTone(d.status)}>{d.status}</Badge>
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
