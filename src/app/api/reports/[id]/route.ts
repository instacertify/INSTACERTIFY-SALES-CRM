import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { makePublicToken, reportPublicUrl } from "@/lib/quotes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        quote: true,
        uploadedBy: { select: { name: true, email: true } },
      },
    });
    if (!report) return jsonError("Report not found", 404);
    return jsonOk({
      ...report,
      publicUrl: reportPublicUrl(report.publicToken),
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
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) return jsonError("Report not found", 404);

    if (body.action === "reshare") {
      const report = await prisma.report.update({
        where: { id },
        data: {
          status: "READY",
          sharedAt: new Date(),
          // optional new token if requested
          publicToken: body.newLink ? makePublicToken() : existing.publicToken,
          message:
            body.message !== undefined
              ? String(body.message)
              : existing.message,
        },
      });
      return jsonOk({
        ...report,
        publicUrl: reportPublicUrl(report.publicToken),
      });
    }

    if (body.action === "revoke") {
      const report = await prisma.report.update({
        where: { id },
        data: { status: "REVOKED" },
      });
      return jsonOk({
        ...report,
        publicUrl: reportPublicUrl(report.publicToken),
      });
    }

    const report = await prisma.report.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title) : undefined,
        message: body.message !== undefined ? String(body.message) : undefined,
      },
    });
    return jsonOk({
      ...report,
      publicUrl: reportPublicUrl(report.publicToken),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
