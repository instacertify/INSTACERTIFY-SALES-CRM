import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader, Panel, Badge, statusTone, EmptyState } from "@/components/ui";

export default async function LeadsPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "ADMIN";
  const leads = await prisma.lead.findMany({
    include: { leadSource: true, createdBy: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Capture enquiries from Consultant, Google Ads, Phone Call, IndiaMART and Referral."
        actions={
          <>
            <Link href="/leads/new" className="btn accent">
              Create Lead
            </Link>
            {isAdmin ? (
              <a href="/api/leads/export" className="btn primary">
                Download Excel
              </a>
            ) : null}
          </>
        }
      />
      <Panel>
        {!leads.length ? (
          <EmptyState
            title="No leads yet"
            body="Add your first lead from any source to start operations and quoting."
            actionHref="/leads/new"
            actionLabel="Create Lead"
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Size</th>
                  <th>Source</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/leads/${lead.id}`}>
                        <strong>{lead.customerName}</strong>
                        <div className="muted">{lead.email}</div>
                      </Link>
                    </td>
                    <td>{lead.company}</td>
                    <td>{lead.companySize}</td>
                    <td>{lead.leadSource.name}</td>
                    <td>
                      {lead.country}
                      {lead.state ? ` / ${lead.state}` : ""}
                    </td>
                    <td>
                      <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td>{format(lead.updatedAt, "dd MMM yyyy")}</td>
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
