import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const leads = await prisma.lead.findMany({
      include: {
        leadSource: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = leads.map((lead) => ({
      Customer: lead.customerName,
      Company: lead.company,
      Size: lead.companySize,
      Email: lead.email,
      Phone: lead.phone,
      Country: lead.country,
      State: lead.state || "",
      Source: lead.leadSource.name,
      Status: lead.status,
      "Follow Up": lead.followUpAt
        ? lead.followUpAt.toISOString()
        : "",
      "Last Contact": lead.lastContactAt
        ? lead.lastContactAt.toISOString()
        : "",
      "Created By": lead.createdBy.name,
      Created: lead.createdAt.toISOString(),
      Notes: lead.notes || "",
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Leads");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="instacertify-leads.xlsx"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
