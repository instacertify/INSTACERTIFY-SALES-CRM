import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuoteLetterhead } from "@/components/QuoteLetterhead";
import { PublicQuoteActions } from "@/components/PublicQuoteActions";
import { parseCustomerTestingItems } from "@/lib/quotes";

type Props = { params: Promise<{ token: string }> };

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
  if (!quote || quote.status === "DRAFT") notFound();

  return (
    <div style={{ padding: "24px 16px 40px" }}>
      <QuoteLetterhead
        quote={{
          ...quote,
          // Customers only see selling price — never purchase price
          testingItems: parseCustomerTestingItems(quote.testingItemsJson),
        }}
      />
      <PublicQuoteActions
        token={token}
        status={quote.status}
        revisionMessage={quote.revisionMessage}
      />
    </div>
  );
}
