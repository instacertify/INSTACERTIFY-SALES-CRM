"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Lead = {
  id: string;
  customerName: string;
  company: string;
  email: string;
  status: string;
  serviceName?: string | null;
  expectedValue: number;
  leadSource?: { name: string };
  assignedTo?: { name: string } | null;
};

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Lead[]>("/leads")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Enquiry pipeline before opportunity, quotation and project creation."
      />
      {error ? <p className="text-rose-600">{error}</p> : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState title="No leads" body="Create leads from the API or seed data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2 font-semibold">Lead</th>
                  <th className="py-2 font-semibold">Service</th>
                  <th className="py-2 font-semibold">Source</th>
                  <th className="py-2 font-semibold">Owner</th>
                  <th className="py-2 font-semibold">Value</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-brand-line/70">
                    <td className="py-3">
                      <Link href={`/leads/${l.id}`} className="font-semibold text-brand-teal">
                        {l.customerName}
                      </Link>
                      <div className="text-xs text-brand-grey">
                        {l.company} · {l.email}
                      </div>
                    </td>
                    <td>{l.serviceName || "—"}</td>
                    <td>{l.leadSource?.name || "—"}</td>
                    <td>{l.assignedTo?.name || "—"}</td>
                    <td>{formatINR(l.expectedValue)}</td>
                    <td>
                      <Badge tone={statusTone(l.status)}>{l.status}</Badge>
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
