import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const source = await prisma.leadSource.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
      },
    });
    return jsonOk(source);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const count = await prisma.lead.count({ where: { leadSourceId: id } });
    if (count > 0) {
      await prisma.leadSource.update({
        where: { id },
        data: { active: false },
      });
      return jsonOk({ ok: true, deactivated: true });
    }
    await prisma.leadSource.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
