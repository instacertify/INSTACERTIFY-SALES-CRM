import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import {
  bankDetailToText,
  parseCustomerTestingItems,
  quotePublicUrl,
  sanitizeTestingItemsForCustomer,
} from "@/lib/quotes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        lead: true,
        bankDetail: true,
        template: true,
        documentRequests: {
          include: { service: true, uploads: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!quote) return jsonError("Quote not found", 404);
    return jsonOk({
      ...quote,
      publicUrl: quotePublicUrl(quote.publicToken),
      testingItems: parseCustomerTestingItems(quote.testingItemsJson),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) return jsonError("Quote not found", 404);

    if (body.action === "share" || body.action === "reshare") {
      const quote = await prisma.quote.update({
        where: { id },
        data: {
          status: "SHARED",
          sharedAt: new Date(),
          revisionMessage: null,
        },
      });
      return jsonOk({
        ...quote,
        publicUrl: quotePublicUrl(quote.publicToken),
      });
    }

    if (body.action === "saveAsTemplate") {
      const template = await prisma.quoteTemplate.create({
        data: {
          name: body.name || `${existing.serviceName} Template`,
          description: body.description || existing.description,
          bodyHtml: existing.bodyHtml,
          validityDays: 30,
          consultingPrice: existing.consultingPrice,
          testingPrice: existing.testingPrice,
          otherCommercials: existing.otherCommercials,
          otherCommercialsNote: existing.otherCommercialsNote,
          serviceNote: existing.serviceName,
          bankDetailId: existing.bankDetailId,
          createdById: user.id,
        },
      });
      return jsonOk(template, { status: 201 });
    }

    const data: Record<string, unknown> = {};
    const editable = [
      "customerName",
      "company",
      "email",
      "phone",
      "country",
      "state",
      "serviceName",
      "description",
      "bodyHtml",
      "otherCommercialsNote",
    ] as const;
    for (const key of editable) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.validityDate !== undefined) {
      data.validityDate = new Date(body.validityDate);
    }
    if (body.consultingPrice !== undefined) {
      data.consultingPrice = Number(body.consultingPrice || 0);
    }
    if (body.testingPrice !== undefined) {
      data.testingPrice = Number(body.testingPrice || 0);
    }
    if (body.otherCommercials !== undefined) {
      data.otherCommercials = Number(body.otherCommercials || 0);
    }
    if (body.testingItems !== undefined) {
      data.testingItemsJson = JSON.stringify(
        sanitizeTestingItemsForCustomer(body.testingItems || []),
      );
    }

    if (body.bankDetailId !== undefined) {
      // Bank selection/snapshot can be changed by creator; master bank records
      // themselves are admin-only elsewhere.
      const bank = await prisma.bankDetail.findUnique({
        where: { id: body.bankDetailId },
      });
      if (!bank) return jsonError("Bank detail not found");
      data.bankDetailId = bank.id;
      data.bankSnapshot = bankDetailToText(bank);
    }

    if (body.bankSnapshot !== undefined) {
      // Free-form bank text on a quote is editable by creator; library by admin only.
      data.bankSnapshot = String(body.bankSnapshot);
    }

    const quote = await prisma.quote.update({
      where: { id },
      data,
    });
    return jsonOk(quote);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.quote.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
