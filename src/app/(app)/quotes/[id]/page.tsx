import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { QuoteLetterhead } from "@/components/QuoteLetterhead";
import { QuoteActions } from "@/components/QuoteActions";
import { parseCustomerTestingItems, quotePublicUrl } from "@/lib/quotes";

type Props = { params: Promise<{ id: string }> };

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;
  const [quote, banks, services] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        documentRequests: {
          include: { service: true, uploads: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.bankDetail.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!quote) notFound();

  const publicUrl = quotePublicUrl(quote.publicToken);
  const testingItems = parseCustomerTestingItems(quote.testingItemsJson);

  return (
    <div>
      <PageHeader
        title={quote.quoteNumber}
        subtitle={`${quote.company} · ${quote.serviceName}`}
        actions={<Badge tone={statusTone(quote.status)}>{quote.status}</Badge>}
      />

      <Panel>
        <QuoteActions
          quote={{
            id: quote.id,
            status: quote.status,
            publicUrl,
            publicToken: quote.publicToken,
            consultingPrice: quote.consultingPrice,
            testingPrice: quote.testingPrice,
            otherCommercials: quote.otherCommercials,
            otherCommercialsNote: quote.otherCommercialsNote,
            bodyHtml: quote.bodyHtml,
            description: quote.description,
            serviceName: quote.serviceName,
            validityDate: quote.validityDate.toISOString(),
            bankSnapshot: quote.bankSnapshot,
            bankDetailId: quote.bankDetailId,
            revisionMessage: quote.revisionMessage,
            customerName: quote.customerName,
            company: quote.company,
            email: quote.email,
            phone: quote.phone,
          }}
          banks={banks}
          services={services}
        />
      </Panel>

      {quote.documentRequests.length ? (
        <Panel>
          <h2>Shared document checklists</h2>
          <div className="stack" style={{ marginTop: 12 }}>
            {quote.documentRequests.map((d) => (
              <div key={d.id} className="notice">
                <strong>
                  {d.service.name} · {d.status}
                </strong>
                <div className="muted">{d.uploads.length} file(s) uploaded</div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <QuoteLetterhead
          quote={{
            ...quote,
            testingItems,
          }}
        />
      </div>
    </div>
  );
}
