import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone, EmptyState } from "@/components/ui";
import { reportPublicUrl } from "@/lib/quotes";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    include: {
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          company: true,
          customerName: true,
          serviceName: true,
        },
      },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { sharedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Upload finished reports on an accepted quote, then share the customer link that the report is ready."
      />
      <Panel>
        {!reports.length ? (
          <EmptyState
            title="No reports yet"
            body="Open an accepted quote and upload the final report to generate a customer share link."
            actionHref="/quotes"
            actionLabel="Go to quotes"
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Quote</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Shared</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.title}</strong>
                      <div className="muted">{report.originalName}</div>
                      <div className="muted">by {report.uploadedBy.name}</div>
                    </td>
                    <td>
                      <Link href={`/quotes/${report.quote.id}`}>
                        {report.quote.quoteNumber}
                      </Link>
                      <div className="muted">{report.quote.serviceName}</div>
                    </td>
                    <td>
                      {report.quote.customerName}
                      <div className="muted">{report.quote.company}</div>
                    </td>
                    <td>
                      <Badge tone={statusTone(report.status)}>
                        {report.status}
                      </Badge>
                    </td>
                    <td>{format(report.sharedAt, "dd MMM yyyy HH:mm")}</td>
                    <td>
                      <a
                        className="btn ghost small"
                        href={reportPublicUrl(report.publicToken)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                      <a
                        className="btn ghost small"
                        href={`/api/reports/${report.id}/download`}
                      >
                        File
                      </a>
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
