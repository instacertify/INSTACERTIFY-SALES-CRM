import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(users);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.name || !body.email || !body.password || !body.role) {
      return jsonError("Missing user fields");
    }
    if (!["ADMIN", "SALES_OPS"].includes(body.role)) {
      return jsonError("Invalid role");
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: String(body.email).toLowerCase().trim(),
        passwordHash: await bcrypt.hash(body.password, 10),
        role: body.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    return jsonOk(user, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
