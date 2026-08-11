"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  EmptyState,
  Button,
  Field,
  inputClass,
} from "@/components/ui";
import { formatINR } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  phone?: string;
  employee?: {
    department?: string;
    title?: string;
    employeeCode?: string;
    monthlyCtc?: number;
    joinDate?: string;
  } | null;
};

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    api<UserRow[]>("/users")
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          role: fd.get("role") || "SALES_OPS",
          phone: fd.get("phone") || undefined,
          department: fd.get("department") || undefined,
          title: fd.get("title") || undefined,
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
        title="Team / HR"
        subtitle="Employees, roles and light HR profiles (department, title, CTC)."
        actions={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "Add user"}
          </Button>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}
      {showForm ? (
        <Panel className="mb-4">
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" required className={inputClass} />
            </Field>
            <Field label="Role">
              <select name="role" className={inputClass} defaultValue="SALES_OPS">
                {["ADMIN", "SALES_OPS", "DELIVERY", "FINANCE"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <input name="department" className={inputClass} />
            </Field>
            <Field label="Title">
              <input name="title" className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Create user</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        {!rows.length ? (
          <EmptyState title="No users" body="Invite your team." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Department</th>
                  <th className="py-2">Title</th>
                  <th className="py-2">CTC</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-xs text-brand-grey">{u.email}</p>
                    </td>
                    <td>{u.role}</td>
                    <td>{u.employee?.department || "—"}</td>
                    <td>{u.employee?.title || "—"}</td>
                    <td>
                      {u.employee?.monthlyCtc
                        ? formatINR(u.employee.monthlyCtc)
                        : "—"}
                    </td>
                    <td>
                      <Badge tone={u.active ? "green" : "neutral"}>
                        {u.active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
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
