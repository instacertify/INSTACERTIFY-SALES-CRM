import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { LeadOperations } from "@/components/LeadOperations";
import { LeadForm } from "@/components/LeadForm";

type Props = { params: Promise<{ id: string }> };

function toLocalInput(date?: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const [lead, sources] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        leadSource: true,
        createdBy: true,
        logs: {
          include: { createdBy: true },
          orderBy: { createdAt: "desc" },
        },
        quotes: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.leadSource.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!lead) notFound();

  return (
    <div>
      <PageHeader
        title={lead.customerName}
        subtitle={`${lead.company} · ${lead.leadSource.name}`}
        actions={
          <Link
            href={`/quotes/new?leadId=${lead.id}`}
            className="btn accent"
          >
            Create Quote
          </Link>
        }
      />

      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel>
          <h2>Lead details</h2>
          <div className="stack" style={{ marginTop: 12 }}>
            <div>
              <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
            </div>
            <p>
              <strong>Email:</strong> {lead.email}
            </p>
            <p>
              <strong>Phone:</strong> {lead.phone}
            </p>
            <p>
              <strong>Location:</strong> {lead.country}
              {lead.state ? `, ${lead.state}` : ""}
            </p>
            <p>
              <strong>Size:</strong> {lead.companySize}
            </p>
            <p className="muted">
              Created by {lead.createdBy.name} on{" "}
              {format(lead.createdAt, "dd MMM yyyy")}
            </p>
          </div>
        </Panel>

        <Panel>
          <h2>Operations</h2>
          <div style={{ marginTop: 12 }}>
            <LeadOperations
              leadId={lead.id}
              status={lead.status}
              followUpAt={toLocalInput(lead.followUpAt)}
              lastContactAt={toLocalInput(lead.lastContactAt)}
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <h2>Conversation logs</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          {lead.logs.map((log) => (
            <div key={log.id} className="notice">
              <strong>{log.createdBy.name}</strong>
              <div className="muted">
                {format(log.createdAt, "dd MMM yyyy HH:mm")}
              </div>
              <p>{log.message}</p>
            </div>
          ))}
          {!lead.logs.length ? (
            <p className="muted">No conversation logs yet.</p>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <h2>Quotes for this lead</h2>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Service</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {lead.quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/quotes/${q.id}`}>{q.quoteNumber}</Link>
                  </td>
                  <td>{q.serviceName}</td>
                  <td>
                    <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                  </td>
                  <td>{format(q.createdAt, "dd MMM yyyy")}</td>
                </tr>
              ))}
              {!lead.quotes.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No quotes yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h2>Edit lead</h2>
        <div style={{ marginTop: 12 }}>
          <LeadForm
            sources={sources}
            initial={{
              id: lead.id,
              customerName: lead.customerName,
              company: lead.company,
              companySize: lead.companySize,
              email: lead.email,
              phone: lead.phone,
              country: lead.country,
              state: lead.state,
              leadSourceId: lead.leadSourceId,
              notes: lead.notes,
              followUpAt: toLocalInput(lead.followUpAt),
            }}
          />
        </div>
      </Panel>
    </div>
  );
}
