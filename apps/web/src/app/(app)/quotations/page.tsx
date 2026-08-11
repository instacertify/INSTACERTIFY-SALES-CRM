"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Quote = {
  id: string;
  quoteNumber: string;
  company: string;
  serviceName: string;
  status: string;
  consultingPrice: number;
  testingPrice: number;
  otherCommercials: number;
  governmentFees: number;
};

export default function QuotationsPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Quote[]>("/quotations")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Sales / Quotations"
        subtitle="Commercial proposals that convert into delivery projects when accepted."
      />
      {error ? <p className="text-rose-600">{error}</p> : null}
      <Panel>
        {!rows.length && !error ? (
          <EmptyState title="No quotations" body="Create quotations from the Nest API." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-brand-line text-brand-grey">
                <tr>
                  <th className="py-2 font-semibold">Quote</th>
                  <th className="py-2 font-semibold">Company</th>
                  <th className="py-2 font-semibold">Service</th>
                  <th className="py-2 font-semibold">Total</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => {
                  const total =
                    q.consultingPrice +
                    q.testingPrice +
                    q.otherCommercials +
                    q.governmentFees;
                  return (
                    <tr key={q.id} className="border-b border-brand-line/70">
                      <td className="py-3 font-semibold">{q.quoteNumber}</td>
                      <td>{q.company}</td>
                      <td>{q.serviceName}</td>
                      <td>{formatINR(total)}</td>
                      <td>
                        <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
