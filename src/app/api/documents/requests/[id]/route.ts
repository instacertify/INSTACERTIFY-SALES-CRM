import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { documentPublicUrl } from "@/lib/quotes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const request = await prisma.documentRequest.findUnique({
      where: { id },
      include: {
        quote: true,
        service: { include: { documents: { where: { active: true } } } },
        uploads: { include: { libraryItem: true } },
        createdBy: { select: { name: true } },
      },
    });
    if (!request) return jsonError("Not found", 404);
    return jsonOk({
      ...request,
      publicUrl: documentPublicUrl(request.publicToken),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.documentRequest.findUnique({
      where: { id },
      include: { quote: true },
    });
    if (!existing) return jsonError("Not found", 404);

    if (body.action === "requestMore") {
      const remark = String(body.teamRemark || "").trim();
      if (!remark) return jsonError("Please add what is missing or extra");
      const updated = await prisma.documentRequest.update({
        where: { id },
        data: {
          status: "NEEDS_MORE",
          teamRemark: remark,
        },
      });
      return jsonOk({
        ...updated,
        publicUrl: documentPublicUrl(updated.publicToken),
      });
    }

    const updated = await prisma.documentRequest.update({
      where: { id },
      data: {
        teamRemark:
          body.teamRemark !== undefined ? body.teamRemark : undefined,
        questionnaire:
          body.questionnaire !== undefined ? body.questionnaire : undefined,
      },
    });
    return jsonOk(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
