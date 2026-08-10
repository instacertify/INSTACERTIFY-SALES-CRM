import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { notifyAdmins } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        leadSource: true,
        createdBy: { select: { id: true, name: true, email: true } },
        logs: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        quotes: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!lead) return jsonError("Lead not found", 404);
    return jsonOk(lead);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return jsonError("Lead not found", 404);

    const data: Record<string, unknown> = {};
    const fields = [
      "customerName",
      "company",
      "companySize",
      "email",
      "phone",
      "country",
      "state",
      "status",
      "notes",
      "leadSourceId",
    ] as const;

    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.followUpAt !== undefined) {
      data.followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
    }
    if (body.lastContactAt !== undefined) {
      data.lastContactAt = body.lastContactAt
        ? new Date(body.lastContactAt)
        : null;
    }
    if (data.country === "India" && !data.state && !existing.state) {
      return jsonError("State is required for India");
    }
    if (data.country && data.country !== "India") data.state = null;

    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: { leadSource: true },
    });

    if (body.logMessage) {
      await prisma.leadLog.create({
        data: {
          leadId: id,
          message: String(body.logMessage),
          createdById: user.id,
        },
      });
      await prisma.lead.update({
        where: { id },
        data: { lastContactAt: new Date() },
      });
      await notifyAdmins(
        "Lead follow-up logged",
        `${user.name || "A user"} logged contact on ${lead.customerName}.`,
        `/leads/${lead.id}`,
      );
    }

    return jsonOk(lead);
  } catch (error) {
    return handleRouteError(error);
  }
}
