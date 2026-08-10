import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { notifyUsers, notifyAllStaff } from "@/lib/notifications";
import { parseCustomerTestingItems, quotePublicUrl } from "@/lib/quotes";

type Params = { params: Promise<{ token: string }> };

function customerQuotePayload(quote: {
  quoteNumber: string;
  status: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  state: string | null;
  serviceName: string;
  description: string;
  validityDate: Date;
  consultingPrice: number;
  testingPrice: number;
  otherCommercials: number;
  otherCommercialsNote: string | null;
  testingItemsJson: string;
  bodyHtml: string;
  bankSnapshot: string;
  customerRemark: string | null;
  revisionMessage: string | null;
  publicToken: string;
  acceptedAt: Date | null;
  sharedAt: Date | null;
}) {
  return {
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    customerName: quote.customerName,
    company: quote.company,
    email: quote.email,
    phone: quote.phone,
    country: quote.country,
    state: quote.state,
    serviceName: quote.serviceName,
    description: quote.description,
    validityDate: quote.validityDate,
    consultingPrice: quote.consultingPrice,
    testingPrice: quote.testingPrice,
    otherCommercials: quote.otherCommercials,
    otherCommercialsNote: quote.otherCommercialsNote,
    // Selling price only — purchase price is never exposed to customers
    testingItems: parseCustomerTestingItems(quote.testingItemsJson),
    bodyHtml: quote.bodyHtml,
    bankSnapshot: quote.bankSnapshot,
    customerRemark: quote.customerRemark,
    revisionMessage: quote.revisionMessage,
    publicUrl: quotePublicUrl(quote.publicToken),
    acceptedAt: quote.acceptedAt,
    sharedAt: quote.sharedAt,
  };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
    });
    if (!quote) return jsonError("Quote not found", 404);
    if (quote.status === "DRAFT") {
      return jsonError("Quote is not shared yet", 403);
    }
    return jsonOk(customerQuotePayload(quote));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const body = await req.json();
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
    });
    if (!quote) return jsonError("Quote not found", 404);
    if (!["SHARED", "REVISION_REQUESTED"].includes(quote.status)) {
      return jsonError("Quote cannot be actioned in current status");
    }

    if (body.action === "accept") {
      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          customerRemark: body.message || quote.customerRemark,
        },
      });
      await notifyUsers(
        [quote.createdById],
        "Quote accepted",
        `${quote.quoteNumber} was accepted by the customer.`,
        `/quotes/${quote.id}`,
      );
      await notifyAllStaff(
        "Quote accepted",
        `${quote.quoteNumber} for ${quote.company} is accepted.`,
        `/quotes/${quote.id}`,
      );
      if (quote.leadId) {
        await prisma.lead.update({
          where: { id: quote.leadId },
          data: { status: "WON" },
        });
      }
      return jsonOk(customerQuotePayload(updated));
    }

    if (body.action === "revise") {
      const message = String(body.message || "").trim();
      if (!message) return jsonError("Please share a revision remark");
      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "REVISION_REQUESTED",
          revisionMessage: message,
          customerRemark: message,
        },
      });
      await notifyUsers(
        [quote.createdById],
        "Quote revision requested",
        `${quote.quoteNumber}: ${message}`,
        `/quotes/${quote.id}`,
      );
      return jsonOk(customerQuotePayload(updated));
    }

    return jsonError("Unknown action");
  } catch (error) {
    return handleRouteError(error);
  }
}
