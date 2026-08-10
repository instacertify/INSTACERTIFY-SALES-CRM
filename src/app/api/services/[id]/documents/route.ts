import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const docs = await prisma.documentLibraryItem.findMany({
      where: { serviceId: id, active: true },
      orderBy: { name: "asc" },
    });
    return jsonOk(docs);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    if (!body.name) return jsonError("Document name required");
    const doc = await prisma.documentLibraryItem.create({
      data: {
        serviceId: id,
        name: body.name,
        description: body.description || null,
        required: body.required !== false,
      },
    });
    return jsonOk(doc, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
