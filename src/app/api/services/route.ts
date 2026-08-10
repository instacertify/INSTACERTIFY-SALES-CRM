import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const services = await prisma.service.findMany({
      where: { active: true },
      include: {
        documents: { where: { active: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    });
    return jsonOk(services);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.name) return jsonError("Service name required");
    const service = await prisma.service.create({
      data: {
        name: body.name,
        description: body.description || null,
      },
    });
    return jsonOk(service, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
