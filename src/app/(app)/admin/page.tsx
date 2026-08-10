"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Panel } from "@/components/ui";

type Source = { id: string; name: string; active: boolean };
type User = { id: string; name: string; email: string; role: string };
type Bank = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch?: string | null;
  upi?: string | null;
  notes?: string | null;
  isDefault: boolean;
};
type Service = {
  id: string;
  name: string;
  description?: string | null;
  documents: { id: string; name: string }[];
};

export default function AdminPage() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("");
  const [selectedService, setSelectedService] = useState("");

  async function load() {
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    if (session?.user?.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    const [s, u, b, svc] = await Promise.all([
      fetch("/api/admin/sources").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/banks").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]);
    setSources(s);
    setUsers(u);
    setBanks(b);
    setServices(svc);
    if (!selectedService && svc[0]) setSelectedService(svc[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  async function addSource(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    (e.target as HTMLFormElement).reset();
    setMessage("Lead source added.");
    load();
  }

  async function addUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Could not create user");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setMessage("User created.");
    load();
  }

  async function addBank(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/banks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountName: form.get("accountName"),
        bankName: form.get("bankName"),
        accountNumber: form.get("accountNumber"),
        ifsc: form.get("ifsc"),
        branch: form.get("branch"),
        upi: form.get("upi"),
        notes: form.get("notes"),
        isDefault: form.get("isDefault") === "on",
      }),
    });
    (e.target as HTMLFormElement).reset();
    setMessage("Bank detail saved.");
    load();
  }

  async function addService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
      }),
    });
    (e.target as HTMLFormElement).reset();
    setMessage("Service added.");
    load();
  }

  async function addDocument(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedService) return;
    const form = new FormData(e.currentTarget);
    await fetch(`/api/services/${selectedService}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
      }),
    });
    (e.target as HTMLFormElement).reset();
    setMessage("Document library item added.");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Manage users, lead sources, banking details and document libraries."
      />
      {message ? <div className="notice ok">{message}</div> : null}

      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel>
          <h2>Users</h2>
          <div className="stack" style={{ marginTop: 12 }}>
            {users.map((u) => (
              <div key={u.id} className="notice">
                <strong>{u.name}</strong>
                <div className="muted">
                  {u.email} · {u.role}
                </div>
              </div>
            ))}
          </div>
          <form className="form-grid" onSubmit={addUser} style={{ marginTop: 14 }}>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <label>
              Role
              <select name="role" defaultValue="SALES_OPS">
                <option value="ADMIN">Admin (Excel download)</option>
                <option value="SALES_OPS">Sales & Operations</option>
              </select>
            </label>
            <button className="btn primary">Create user</button>
          </form>
        </Panel>

        <Panel>
          <h2>Lead sources</h2>
          <div className="stack" style={{ marginTop: 12 }}>
            {sources.map((s) => (
              <div key={s.id} className="notice">
                {s.name} {s.active ? "" : "(inactive)"}
              </div>
            ))}
          </div>
          <form className="form-grid" onSubmit={addSource} style={{ marginTop: 14 }}>
            <label>
              New source
              <input name="name" required placeholder="e.g. Trade Show" />
            </label>
            <button className="btn primary">Add source</button>
          </form>
        </Panel>
      </div>

      <Panel>
        <h2>Banking details (admin editable)</h2>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Account</th>
                <th>Bank</th>
                <th>Account no.</th>
                <th>IFSC</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b.id}>
                  <td>{b.accountName}</td>
                  <td>{b.bankName}</td>
                  <td>{b.accountNumber}</td>
                  <td>{b.ifsc}</td>
                  <td>{b.isDefault ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="form-grid" onSubmit={addBank} style={{ marginTop: 14 }}>
          <div className="form-grid two">
            <label>
              Account name
              <input name="accountName" required />
            </label>
            <label>
              Bank name
              <input name="bankName" required />
            </label>
          </div>
          <div className="form-grid two">
            <label>
              Account number
              <input name="accountNumber" required />
            </label>
            <label>
              IFSC
              <input name="ifsc" required />
            </label>
          </div>
          <div className="form-grid two">
            <label>
              Branch
              <input name="branch" />
            </label>
            <label>
              UPI
              <input name="upi" />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="isDefault" /> Set as default
          </label>
          <button className="btn primary">Save bank detail</button>
        </form>
      </Panel>

      <Panel>
        <h2>Services & document library</h2>
        <form className="form-grid" onSubmit={addService} style={{ marginTop: 12 }}>
          <div className="form-grid two">
            <label>
              Service name
              <input name="name" required />
            </label>
            <label>
              Description
              <input name="description" />
            </label>
          </div>
          <button className="btn ghost">Add service</button>
        </form>

        <form className="form-grid" onSubmit={addDocument} style={{ marginTop: 16 }}>
          <label>
            Add document to service
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid two">
            <label>
              Document name
              <input name="name" required />
            </label>
            <label>
              Description
              <input name="description" />
            </label>
          </div>
          <button className="btn primary">Add document item</button>
        </form>

        <div className="stack" style={{ marginTop: 16 }}>
          {services.map((s) => (
            <div key={s.id} className="notice">
              <strong>{s.name}</strong>
              <ul>
                {s.documents.map((d) => (
                  <li key={d.id}>{d.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
