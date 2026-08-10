import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.quoteTemplate.findUnique({ where: { id } });
    if (!existing) return jsonError("Template not found", 404);

    const data: Record<string, unknown> = {};
    const sharedFields = [
      "name",
      "description",
      "bodyHtml",
      "serviceNote",
      "otherCommercialsNote",
    ] as const;
    for (const key of sharedFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.validityDays !== undefined)
      data.validityDays = Number(body.validityDays || 30);
    if (body.consultingPrice !== undefined)
      data.consultingPrice = Number(body.consultingPrice || 0);
    if (body.testingPrice !== undefined)
      data.testingPrice = Number(body.testingPrice || 0);
    if (body.otherCommercials !== undefined)
      data.otherCommercials = Number(body.otherCommercials || 0);

    // Bank details on templates can only be changed by admin
    if (body.bankDetailId !== undefined) {
      if (user.role !== "ADMIN") {
        return jsonError("Only admin can edit bank details on templates", 403);
      }
      data.bankDetailId = body.bankDetailId || null;
    }

    const template = await prisma.quoteTemplate.update({
      where: { id },
      data,
    });
    return jsonOk(template);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.quoteTemplate.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
