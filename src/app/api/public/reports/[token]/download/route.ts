import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const report = await prisma.report.findUnique({
      where: { publicToken: token },
    });
    if (!report || report.status !== "READY") {
      return jsonError("Report not found or no longer available", 404);
    }

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
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
