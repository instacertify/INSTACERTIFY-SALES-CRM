import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";

export default async function OperationsPage() {
  const now = new Date();
  const [leads, accepted, revisions, docs, reports] = await Promise.all([
    prisma.lead.findMany({
      where: {
        status: { in: ["NEW", "CONTACTED", "FOLLOW_UP", "QUOTE_SENT"] },
      },
      include: { leadSource: true },
      orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.quote.findMany({
      where: { status: "ACCEPTED" },
      orderBy: { acceptedAt: "desc" },
      take: 20,
    }),
    prisma.quote.findMany({
      where: { status: "REVISION_REQUESTED" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.documentRequest.findMany({
      where: { status: { in: ["UPLOADED", "FINAL", "NEEDS_MORE"] } },
      include: { quote: true, service: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.report.findMany({
      where: { status: "READY" },
      include: { quote: true },
      orderBy: { sharedAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Operations"
        subtitle="Follow-ups, last contact, accepted quotes, revision requests and document uploads."
      />

      <Panel>
        <h2>Lead pipeline & reminders</h2>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Follow up</th>
                <th>Last contact</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const overdue =
                  lead.followUpAt && lead.followUpAt.getTime() < now.getTime();
                return (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/leads/${lead.id}`}>
                        <strong>{lead.customerName}</strong>
                        <div className="muted">{lead.company}</div>
                      </Link>
                    </td>
                    <td>
                      <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td>
                      {lead.followUpAt
                        ? format(lead.followUpAt, "dd MMM yyyy HH:mm")
                        : "—"}
                      {overdue ? (
                        <div className="error-text">Overdue</div>
                      ) : null}
                    </td>
                    <td>
                      {lead.lastContactAt
                        ? format(lead.lastContactAt, "dd MMM yyyy HH:mm")
                        : "—"}
                    </td>
                    <td>{lead.leadSource.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel>
          <h2>Quotes accepted</h2>
          <div className="stack" style={{ marginTop: 12 }}>
            {accepted.map((q) => (
              <div key={q.id} className="notice ok">
                <Link href={`/quotes/${q.id}`}>
                  <strong>{q.quoteNumber}</strong> · {q.company}
                </Link>
                <div className="muted">
                  Accepted{" "}
                  {q.acceptedAt ? format(q.acceptedAt, "dd MMM yyyy") : ""}
                </div>
              </div>
            ))}
            {!accepted.length ? (
              <p className="muted">No accepted quotes yet.</p>
            ) : null}
          </div>
        </Panel>
        <Panel>
          <h2>Revision requested</h2>
          <div className="stack" style={{ marginTop: 12 }}>
            {revisions.map((q) => (
              <div key={q.id} className="notice warn">
                <Link href={`/quotes/${q.id}`}>
                  <strong>{q.quoteNumber}</strong> · {q.company}
                </Link>
                <div>{q.revisionMessage}</div>
              </div>
            ))}
            {!revisions.length ? (
              <p className="muted">No revision requests.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel>
        <h2>Customer document activity</h2>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Service</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href="/documents">{d.quote.quoteNumber}</Link>
                  </td>
                  <td>{d.service.name}</td>
                  <td>
                    <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                  </td>
                  <td>{format(d.updatedAt, "dd MMM yyyy HH:mm")}</td>
                </tr>
              ))}
              {!docs.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No document uploads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h2>Reports ready / shared with customers</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          {reports.map((report) => (
            <div key={report.id} className="notice ok">
              <Link href={`/quotes/${report.quoteId}`}>
                <strong>{report.title}</strong> · {report.quote.quoteNumber}
              </Link>
              <div className="muted">
                {report.quote.company} · {format(report.sharedAt, "dd MMM yyyy HH:mm")}
              </div>
            </div>
          ))}
          {!reports.length ? (
            <p className="muted">No customer reports shared yet.</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
