import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const templates = await prisma.quoteTemplate.findMany({
      include: {
        createdBy: { select: { name: true } },
        bankDetail: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk(templates);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (!body.name) return jsonError("Template name is required");

    const template = await prisma.quoteTemplate.create({
      data: {
        name: body.name,
        description: body.description || null,
        bodyHtml: body.bodyHtml || "",
        validityDays: Number(body.validityDays || 30),
        consultingPrice: Number(body.consultingPrice || 0),
        testingPrice: Number(body.testingPrice || 0),
        otherCommercials: Number(body.otherCommercials || 0),
        otherCommercialsNote: body.otherCommercialsNote || null,
        serviceNote: body.serviceNote || null,
        bankDetailId: body.bankDetailId || null,
        createdById: user.id,
      },
    });
    return jsonOk(template, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
