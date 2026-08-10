"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Customer = {
  id: string;
  company: string;
  email: string;
  country: string;
  lifetimeValue: number;
  _count: { projects: number; contacts: number; quotations: number };
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Customer[]>("/customers")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="One account can hold many projects — BIS, WPC, EPR, testing and more."
      />
      {error ? <p className="text-rose-600">{error}</p> : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState
            title="No customers yet"
            body="Customers are created from won leads and quotations."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2 font-semibold">Company</th>
                  <th className="py-2 font-semibold">Country</th>
                  <th className="py-2 font-semibold">Projects</th>
                  <th className="py-2 font-semibold">Contacts</th>
                  <th className="py-2 font-semibold">Lifetime value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <Link href={`/customers/${c.id}`} className="font-semibold text-brand-teal">
                        {c.company}
                      </Link>
                      <div className="text-xs text-brand-grey">{c.email}</div>
                    </td>
                    <td>{c.country}</td>
                    <td>{c._count.projects}</td>
                    <td>{c._count.contacts}</td>
                    <td>{formatINR(c.lifetimeValue)}</td>
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
