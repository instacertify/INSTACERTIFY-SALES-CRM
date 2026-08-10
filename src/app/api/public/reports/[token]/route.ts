import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { BRAND } from "@/lib/constants";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const report = await prisma.report.findUnique({
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
      },
    });
    if (!report || report.status !== "READY") {
      return jsonError("Report not found or no longer available", 404);
    }

    return jsonOk({
      title: report.title,
      message: report.message,
      originalName: report.originalName,
      size: report.size,
      mimeType: report.mimeType,
      sharedAt: report.sharedAt,
      quoteNumber: report.quote.quoteNumber,
      company: report.quote.company,
      customerName: report.quote.customerName,
      serviceName: report.quote.serviceName,
      brand: BRAND.name,
      downloadPath: `/api/public/reports/${token}/download`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
