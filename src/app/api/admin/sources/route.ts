import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const sources = await prisma.leadSource.findMany({
      orderBy: { name: "asc" },
    });
    return jsonOk(sources);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.name) return jsonError("Name required");
    const source = await prisma.leadSource.create({
      data: { name: String(body.name).trim() },
    });
    return jsonOk(source, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
