import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.testingService.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    if (user.role === "ADMIN") return jsonOk(items);

    // Sales/Ops & any non-admin: selling price + lab only — never purchase price
    return jsonOk(
      items.map(({ purchasePrice: _purchasePrice, ...rest }) => rest),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.name || !body.labName) return jsonError("Name and lab required");
    const item = await prisma.testingService.create({
      data: {
        name: body.name,
        labName: body.labName,
        purchasePrice: Number(body.purchasePrice || 0),
        salesPrice: Number(body.salesPrice || 0),
        description: body.description || null,
      },
    });
    return jsonOk(item, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
