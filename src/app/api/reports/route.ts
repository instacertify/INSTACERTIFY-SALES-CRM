import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { makePublicToken, reportPublicUrl } from "@/lib/quotes";
import { notifyAllStaff, notifyUsers } from "@/lib/notifications";

export async function GET() {
  try {
    await requireUser();
    const reports = await prisma.report.findMany({
      include: {
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            company: true,
            customerName: true,
            serviceName: true,
          },
        },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { sharedAt: "desc" },
    });
    return jsonOk(
      reports.map((r) => ({
        ...r,
        publicUrl: reportPublicUrl(r.publicToken),
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const quoteId = String(form.get("quoteId") || "");
    const title = String(form.get("title") || "").trim();
    const message = String(form.get("message") || "").trim();
    const file = form.get("file");

    if (!quoteId) return jsonError("Quote is required");
    if (!title) return jsonError("Report title is required");
    if (!(file instanceof File)) return jsonError("Report file is required");

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return jsonError("Quote not found", 404);
    if (quote.status !== "ACCEPTED") {
      return jsonError("Reports can be shared after the quote is accepted");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const storedName = `${Date.now()}-${randomBytes(6).toString("hex")}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const dir = path.join(process.cwd(), "uploads", "reports", quoteId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, storedName), bytes);

    const report = await prisma.report.create({
      data: {
        quoteId,
        title,
        message:
          message ||
          `Your report for quote ${quote.quoteNumber} is ready to download.`,
        originalName: file.name,
        storedName,
        mimeType: file.type || null,
        size: bytes.length,
        publicToken: makePublicToken(),
        status: "READY",
        sharedAt: new Date(),
        uploadedById: user.id,
      },
      include: {
        quote: {
          select: { quoteNumber: true, company: true, createdById: true },
        },
      },
    });

    await notifyUsers(
      [quote.createdById],
      "Report ready for customer",
      `${report.title} uploaded for ${quote.quoteNumber}. Share the customer link.`,
      `/quotes/${quote.id}`,
    );
    await notifyAllStaff(
      "Report shared with customer",
      `${quote.quoteNumber}: ${report.title} is ready.`,
      `/reports`,
    );

    if (quote.leadId) {
      await prisma.leadLog.create({
        data: {
          leadId: quote.leadId,
          message: `Report uploaded and shared: ${report.title}`,
          createdById: user.id,
        },
      });
    }

    return jsonOk(
      {
        ...report,
        publicUrl: reportPublicUrl(report.publicToken),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
