import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const upload = await prisma.customerDocumentUpload.findUnique({
      where: { id },
    });
    if (!upload) return jsonError("Not found", 404);
    const filePath = path.join(
      process.cwd(),
      "uploads",
      "documents",
      upload.requestId,
      upload.storedName,
    );
    const data = await readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": upload.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${upload.originalName}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
