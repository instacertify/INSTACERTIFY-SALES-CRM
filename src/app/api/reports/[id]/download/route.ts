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
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return jsonError("Report not found", 404);

    const filePath = path.join(
      process.cwd(),
      "uploads",
      "reports",
      report.quoteId,
      report.storedName,
    );
    const data = await readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": report.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${report.originalName}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
