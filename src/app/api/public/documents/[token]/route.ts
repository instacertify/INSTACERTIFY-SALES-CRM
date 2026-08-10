import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { notifyAllStaff, notifyUsers } from "@/lib/notifications";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const request = await prisma.documentRequest.findUnique({
      where: { publicToken: token },
      include: {
        quote: {
          select: {
            quoteNumber: true,
            company: true,
            customerName: true,
            serviceName: true,
          },
        },
        service: {
          include: { documents: { where: { active: true }, orderBy: { name: "asc" } } },
        },
        uploads: { include: { libraryItem: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!request) return jsonError("Not found", 404);
    return jsonOk({
      id: request.id,
      status: request.status,
      quoteNumber: request.quote.quoteNumber,
      company: request.quote.company,
      customerName: request.quote.customerName,
      serviceName: request.service.name,
      questionnaire: request.questionnaire,
      teamRemark: request.teamRemark,
      customerFinalNote: request.customerFinalNote,
      documents: request.service.documents,
      uploads: request.uploads.map((u) => ({
        id: u.id,
        originalName: u.originalName,
        remark: u.remark,
        libraryItem: u.libraryItem?.name || null,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const request = await prisma.documentRequest.findUnique({
      where: { publicToken: token },
      include: { quote: true },
    });
    if (!request) return jsonError("Not found", 404);

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.action === "finalize") {
        const updated = await prisma.documentRequest.update({
          where: { id: request.id },
          data: {
            status: "FINAL",
            customerFinalNote: body.note || null,
          },
        });
        await notifyUsers(
          [request.createdById],
          "Customer finalized documents",
          `${request.quote.quoteNumber}: document list marked final.`,
          `/documents`,
        );
        await notifyAllStaff(
          "New customer document upload finalized",
          `${request.quote.company} finalized documents for ${request.quote.quoteNumber}.`,
          `/documents`,
        );
        return jsonOk(updated);
      }
      return jsonError("Unknown action");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("File required");
    const libraryItemId = String(form.get("libraryItemId") || "") || null;
    const remark = String(form.get("remark") || "") || null;

    const bytes = Buffer.from(await file.arrayBuffer());
    const storedName = `${Date.now()}-${randomBytes(6).toString("hex")}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const dir = path.join(process.cwd(), "uploads", "documents", request.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, storedName), bytes);

    const upload = await prisma.customerDocumentUpload.create({
      data: {
        requestId: request.id,
        libraryItemId,
        originalName: file.name,
        storedName,
        mimeType: file.type || null,
        size: bytes.length,
        remark,
      },
    });

    await prisma.documentRequest.update({
      where: { id: request.id },
      data: { status: "UPLOADED" },
    });

    await notifyUsers(
      [request.createdById],
      "Customer uploaded a document",
      `${request.quote.quoteNumber}: ${file.name}`,
      `/documents`,
    );

    return jsonOk(upload, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
