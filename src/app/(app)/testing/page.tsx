"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/ui";
import { formatINR } from "@/lib/constants";

type Item = {
  id: string;
  name: string;
  labName: string;
  salesPrice: number;
  purchasePrice?: number;
  description?: string | null;
};

export default function TestingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [role, setRole] = useState("SALES_OPS");
  const [message, setMessage] = useState("");

  async function load() {
    const [res, sessionRes] = await Promise.all([
      fetch("/api/testing"),
      fetch("/api/auth/session"),
    ]);
    setItems(await res.json());
    const session = await sessionRes.json();
    if (session?.user?.role) setRole(session.user.role);
  }

  useEffect(() => {
    load();
  }, []);

  async function createItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/testing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        labName: form.get("labName"),
        purchasePrice: Number(form.get("purchasePrice") || 0),
        salesPrice: Number(form.get("salesPrice") || 0),
        description: form.get("description"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setMessage("Testing service added.");
    load();
  }

  async function updateSales(id: string, salesPrice: number) {
    const res = await fetch(`/api/testing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesPrice }),
    });
    if (res.ok) {
      setMessage("Sales price updated.");
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Testing price library"
        subtitle="Sales & operations see lab name and sales price. Purchase price is admin-only."
      />

      {role === "ADMIN" ? (
        <Panel>
          <h2>Add testing service</h2>
          <form className="form-grid" onSubmit={createItem} style={{ marginTop: 12 }}>
            <div className="form-grid two">
              <label>
                Test name
                <input name="name" required />
              </label>
              <label>
                Lab name
                <input name="labName" required />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Purchase price (admin only)
                <input type="number" name="purchasePrice" required />
              </label>
              <label>
                Sales price
                <input type="number" name="salesPrice" required />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" />
            </label>
            <button className="btn primary">Add to library</button>
          </form>
        </Panel>
      ) : null}

      <Panel>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Test</th>
                <th>Lab</th>
                <th>Sales price</th>
                {role === "ADMIN" ? <th>Purchase price</th> : null}
                <th>Adjust sales</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description ? (
                      <div className="muted">{item.description}</div>
                    ) : null}
                  </td>
                  <td>{item.labName}</td>
                  <td>{formatINR(item.salesPrice)}</td>
                  {role === "ADMIN" ? (
                    <td>{formatINR(item.purchasePrice || 0)}</td>
                  ) : null}
                  <td>
                    <input
                      type="number"
                      defaultValue={item.salesPrice}
                      style={{ maxWidth: 140 }}
                      onBlur={(e) =>
                        updateSales(item.id, Number(e.target.value || 0))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {message ? <div className="notice ok">{message}</div> : null}
      </Panel>
    </div>
  );
}
