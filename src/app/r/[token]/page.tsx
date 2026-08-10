import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { BrandMark } from "@/components/BrandMark";
import { BRAND } from "@/lib/constants";

type Props = { params: Promise<{ token: string }> };

export default async function PublicReportPage({ params }: Props) {
  const { token } = await params;
  const report = await prisma.report.findUnique({
    where: { publicToken: token },
    include: {
      quote: {
        select: {
          quoteNumber: true,
          company: true,
          customerName: true,
          serviceName: true,
        },
      },
    },
  });
  if (!report || report.status !== "READY") notFound();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <article className="panel" style={{ animation: "rise 0.45s ease both" }}>
        <BrandMark size="md" />
        <p className="muted" style={{ marginTop: 10 }}>
          {BRAND.legalName}
        </p>

        <div className="notice ok" style={{ marginTop: 22 }}>
          <strong>Your report is ready</strong>
          <p>
            {report.message ||
              `The report for quote ${report.quote.quoteNumber} is ready to download.`}
          </p>
        </div>

        <h1 style={{ marginTop: 22, fontSize: "1.8rem" }}>{report.title}</h1>
        <div className="stack" style={{ marginTop: 12 }}>
          <p>
            <strong>Quote:</strong> {report.quote.quoteNumber}
          </p>
          <p>
            <strong>Customer:</strong> {report.quote.customerName} ·{" "}
            {report.quote.company}
          </p>
          <p>
            <strong>Service:</strong> {report.quote.serviceName}
          </p>
          <p className="muted">
            Shared on {format(report.sharedAt, "dd MMM yyyy HH:mm")}
          </p>
          <p className="muted">File: {report.originalName}</p>
        </div>

        <div className="row" style={{ marginTop: 24 }}>
          <a
            className="btn accent"
            href={`/api/public/reports/${token}/download`}
          >
            Download report
          </a>
        </div>
      </article>
    </div>
  );
}
