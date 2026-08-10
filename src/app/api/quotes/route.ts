import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import {
  bankDetailToText,
  makePublicToken,
  nextQuoteNumber,
  sanitizeTestingItemsForCustomer,
} from "@/lib/quotes";
import { upsertCustomer } from "@/lib/crm";

export async function GET() {
  try {
    await requireUser();
    const quotes = await prisma.quote.findMany({
      include: {
        createdBy: { select: { id: true, name: true } },
        lead: { select: { id: true, customerName: true, company: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk(quotes);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      leadId,
      templateId,
      customerName,
      company,
      email,
      phone,
      country,
      state,
      serviceName,
      description,
      validityDate,
      consultingPrice,
      testingPrice,
      otherCommercials,
      otherCommercialsNote,
      testingItems,
      bodyHtml,
      bankDetailId,
    } = body;

    if (
      !customerName ||
      !company ||
      !email ||
      !phone ||
      !country ||
      !serviceName ||
      !description ||
      !validityDate
    ) {
      return jsonError("Missing required quote fields");
    }

    let bankSnapshot = "";
    let resolvedBankId = bankDetailId || null;
    if (resolvedBankId) {
      const bank = await prisma.bankDetail.findUnique({
        where: { id: resolvedBankId },
      });
      if (!bank) return jsonError("Bank detail not found");
      bankSnapshot = bankDetailToText(bank);
    } else {
      const bank = await prisma.bankDetail.findFirst({
        where: { isDefault: true },
      });
      if (bank) {
        resolvedBankId = bank.id;
        bankSnapshot = bankDetailToText(bank);
      }
    }

    const customer = await upsertCustomer({
      email,
      customerName,
      company,
      phone,
      country,
      state: country === "India" ? state || null : state || null,
    });

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: await nextQuoteNumber(),
        publicToken: makePublicToken(),
        leadId: leadId || null,
        customerId: customer?.id || null,
        templateId: templateId || null,
        customerName,
        company,
        email,
        phone,
        country,
        state: country === "India" ? state || null : null,
        serviceName,
        description,
        validityDate: new Date(validityDate),
        consultingPrice: Number(consultingPrice || 0),
        testingPrice: Number(testingPrice || 0),
        otherCommercials: Number(otherCommercials || 0),
        otherCommercialsNote: otherCommercialsNote || null,
        // Persist selling price only — never store purchase price on quotes
        testingItemsJson: JSON.stringify(
          sanitizeTestingItemsForCustomer(testingItems || []),
        ),
        bodyHtml: bodyHtml || "",
        bankDetailId: resolvedBankId,
        bankSnapshot,
        createdById: user.id,
        status: "DRAFT",
      },
    });

    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: "QUOTATION",
          customerId: customer?.id || undefined,
          serviceName,
        },
      });
      await prisma.leadLog.create({
        data: {
          leadId,
          message: `Quote ${quote.quoteNumber} created`,
          createdById: user.id,
        },
      });
    }

    return jsonOk(quote, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
