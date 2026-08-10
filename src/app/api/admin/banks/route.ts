import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const banks = await prisma.bankDetail.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    return jsonOk(banks);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (
      !body.accountName ||
      !body.bankName ||
      !body.accountNumber ||
      !body.ifsc
    ) {
      return jsonError("Missing bank fields");
    }
    if (body.isDefault) {
      await prisma.bankDetail.updateMany({ data: { isDefault: false } });
    }
    const bank = await prisma.bankDetail.create({
      data: {
        accountName: body.accountName,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        ifsc: body.ifsc,
        branch: body.branch || null,
        upi: body.upi || null,
        notes: body.notes || null,
        isDefault: Boolean(body.isDefault),
      },
    });
    return jsonOk(bank, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
