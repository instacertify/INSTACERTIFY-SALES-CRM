import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.testingService.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.labName !== undefined) data.labName = body.labName;
    if (body.description !== undefined) data.description = body.description;
    if (body.active !== undefined) data.active = Boolean(body.active);
    // Sales can manually override sales price for quoting ideas; purchase only admin
    if (body.salesPrice !== undefined)
      data.salesPrice = Number(body.salesPrice || 0);
    if (body.purchasePrice !== undefined) {
      if (user.role !== "ADMIN") {
        return jsonError("Only admin can edit purchase price", 403);
      }
      data.purchasePrice = Number(body.purchasePrice || 0);
    }

    // Non-admins cannot rename core library fields except sales price override
    if (user.role !== "ADMIN") {
      const item = await prisma.testingService.update({
        where: { id },
        data: { salesPrice: Number(body.salesPrice ?? existing.salesPrice) },
      });
      const { purchasePrice: _p, ...rest } = item;
      return jsonOk({ ...rest, purchasePrice: undefined });
    }

    const item = await prisma.testingService.update({ where: { id }, data });
    return jsonOk(item);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.testingService.update({
      where: { id },
      data: { active: false },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
