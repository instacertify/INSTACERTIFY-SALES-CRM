import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    if (body.isDefault) {
      await prisma.bankDetail.updateMany({ data: { isDefault: false } });
    }
    const bank = await prisma.bankDetail.update({
      where: { id },
      data: {
        accountName: body.accountName,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        ifsc: body.ifsc,
        branch: body.branch,
        upi: body.upi,
        notes: body.notes,
        isDefault:
          body.isDefault !== undefined ? Boolean(body.isDefault) : undefined,
      },
    });
    return jsonOk(bank);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.bankDetail.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
