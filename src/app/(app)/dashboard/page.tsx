import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader, Panel, Stat, Badge, statusTone } from "@/components/ui";
import { formatINR, quoteRevenue } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [
    leadCount,
    followUps,
    acceptedQuotes,
    quotes,
    notifications,
    docUploads,
    readyReports,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.findMany({
      where: {
        OR: [
          { followUpAt: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2) } },
          { status: "FOLLOW_UP" },
        ],
      },
      include: { leadSource: true },
      orderBy: { followUpAt: "asc" },
      take: 8,
    }),
    prisma.quote.count({ where: { status: "ACCEPTED" } }),
    prisma.quote.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.documentRequest.findMany({
      where: { status: { in: ["UPLOADED", "FINAL"] } },
      include: { quote: true, service: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.report.findMany({
      where: { status: "READY" },
      include: { quote: true },
      orderBy: { sharedAt: "desc" },
      take: 6,
    }),
  ]);

  const revenue = quotes.reduce((sum, q) => sum + quoteRevenue(q), 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${session?.user.name}. Track leads, follow-ups, accepted quotes and document uploads.`}
        actions={
          <>
            <Link href="/leads/new" className="btn accent">
              Create Lead
            </Link>
            <Link href="/quotes/new" className="btn primary">
              Create Quote
            </Link>
          </>
        }
      />

      <div className="stats-grid">
        <Stat label="Total Leads" value={leadCount} tone="teal" />
        <Stat label="Accepted Quotes" value={acceptedQuotes} tone="orange" />
        <Stat label="Follow-ups Due" value={followUps.length} tone="ink" />
        <Stat label="Recent Quote Value" value={formatINR(revenue)} tone="teal" />
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <Panel>
          <h2>Reminders & follow-ups</h2>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Follow up</th>
                  <th>Last contact</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((lead) => (
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
                        ? format(lead.followUpAt, "dd MMM yyyy")
                        : "—"}
                    </td>
                    <td>
                      {lead.lastContactAt
                        ? format(lead.lastContactAt, "dd MMM yyyy")
                        : "—"}
                    </td>
                  </tr>
                ))}
                {!followUps.length ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No follow-ups pending.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>Notifications</h2>
            <Link href="/operations" className="btn ghost small">
              Operations
            </Link>
          </div>
          <div className="stack" style={{ marginTop: 12 }}>
            {notifications.map((n) => (
              <div key={n.id} className={n.read ? "notice" : "notice warn"}>
                <strong>{n.title}</strong>
                <div className="muted">{n.message}</div>
                {n.link ? (
                  <Link href={n.link} className="btn ghost small">
                    Open
                  </Link>
                ) : null}
              </div>
            ))}
            {!notifications.length ? (
              <p className="muted">No notifications yet.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel>
        <h2>Accepted quotes & document uploads</h2>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Company</th>
                <th>Service</th>
                <th>Doc status</th>
              </tr>
            </thead>
            <tbody>
              {docUploads.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/quotes/${d.quoteId}`}>{d.quote.quoteNumber}</Link>
                  </td>
                  <td>{d.quote.company}</td>
                  <td>{d.service.name}</td>
                  <td>
                    <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                  </td>
                </tr>
              ))}
              {!docUploads.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No customer document activity yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Reports ready for customers</h2>
          <Link href="/reports" className="btn ghost small">
            All reports
          </Link>
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          {readyReports.map((report) => (
            <div key={report.id} className="notice ok">
              <Link href={`/quotes/${report.quoteId}`}>
                <strong>{report.title}</strong> · {report.quote.quoteNumber}
              </Link>
              <div className="muted">
                {report.quote.company} · shared{" "}
                {format(report.sharedAt, "dd MMM yyyy")}
              </div>
            </div>
          ))}
          {!readyReports.length ? (
            <p className="muted">No reports shared yet.</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
