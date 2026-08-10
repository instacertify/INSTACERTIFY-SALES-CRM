import { prisma } from "@/lib/prisma";
import { PageHeader, Panel } from "@/components/ui";
import { QuoteForm } from "@/components/QuoteForm";

type Props = { searchParams: Promise<{ leadId?: string }> };

export default async function NewQuotePage({ searchParams }: Props) {
  const { leadId } = await searchParams;
  const [templates, banks, testingServices, services, lead] = await Promise.all([
    prisma.quoteTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.bankDetail.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.testingService.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    leadId
      ? prisma.lead.findUnique({ where: { id: leadId } })
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <PageHeader
        title="Create quote"
        subtitle="Use a template, pick testing labs by sales price, and generate a unique letterhead quote."
      />
      <Panel>
        <QuoteForm
          templates={templates}
          banks={banks}
          testingServices={testingServices.map(
            ({ purchasePrice: _p, ...rest }) => rest,
          )}
          services={services}
          lead={lead}
        />
      </Panel>
    </div>
  );
}
