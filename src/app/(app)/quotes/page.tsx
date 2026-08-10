import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatINR, quoteRevenue } from "@/lib/constants";

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({
    include: { createdBy: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle="Unique quote IDs, letterhead, scannable QR links, accept/revise workflow."
        actions={
          <Link href="/quotes/new" className="btn accent">
            Create Quote
          </Link>
        }
      />
      <Panel>
        {!quotes.length ? (
          <EmptyState
            title="No quotes yet"
            body="Create a quote from a lead or directly from the quotes module."
            actionHref="/quotes/new"
            actionLabel="Create Quote"
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <Link href={`/quotes/${q.id}`}>
                        <strong>{q.quoteNumber}</strong>
                      </Link>
                    </td>
                    <td>
                      {q.customerName}
                      <div className="muted">{q.company}</div>
                    </td>
                    <td>{q.serviceName}</td>
                    <td>{formatINR(quoteRevenue(q))}</td>
                    <td>
                      <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                    </td>
                    <td>{format(q.updatedAt, "dd MMM yyyy")}</td>
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
