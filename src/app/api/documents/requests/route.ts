import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { documentPublicUrl, makePublicToken } from "@/lib/quotes";

export async function GET() {
  try {
    await requireUser();
    const requests = await prisma.documentRequest.findMany({
      include: {
        quote: { select: { quoteNumber: true, company: true, id: true } },
        service: true,
        createdBy: { select: { name: true } },
        uploads: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk(
      requests.map((r) => ({
        ...r,
        publicUrl: documentPublicUrl(r.publicToken),
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (!body.quoteId || !body.serviceId) {
      return jsonError("Quote and service are required");
    }
    const quote = await prisma.quote.findUnique({ where: { id: body.quoteId } });
    if (!quote) return jsonError("Quote not found", 404);
    if (quote.status !== "ACCEPTED") {
      return jsonError("Documents can be shared only after quote acceptance");
    }

    const request = await prisma.documentRequest.create({
      data: {
        quoteId: body.quoteId,
        serviceId: body.serviceId,
        publicToken: makePublicToken(),
        questionnaire: body.questionnaire || null,
        teamRemark: body.teamRemark || null,
        createdById: user.id,
        status: "SHARED",
      },
      include: { service: true, quote: true },
    });

    return jsonOk(
      {
        ...request,
        publicUrl: documentPublicUrl(request.publicToken),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
