import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { notifyAdmins } from "@/lib/notifications";
import { ensureProjectForLead, upsertCustomer } from "@/lib/crm";
import { LEAD_STATUSES } from "@/lib/constants";

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
        assignedTo: { select: { id: true, name: true, email: true } },
        customer: true,
        projects: { orderBy: { createdAt: "desc" } },
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

    if (body.action === "createProject") {
      const project = await ensureProjectForLead(id, user.id);
      await prisma.leadLog.create({
        data: {
          leadId: id,
          message: `Project ${project.projectNumber} created`,
          createdById: user.id,
        },
      });
      return jsonOk(project, { status: 201 });
    }

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
      "product",
      "serviceName",
      "assignedToId",
    ] as const;

    for (const key of fields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.expectedValue !== undefined) {
      data.expectedValue = Number(body.expectedValue || 0);
    }
    if (body.expectedClose !== undefined) {
      data.expectedClose = body.expectedClose
        ? new Date(body.expectedClose)
        : null;
    }
    if (body.followUpAt !== undefined) {
      data.followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
    }
    if (body.lastContactAt !== undefined) {
      data.lastContactAt = body.lastContactAt
        ? new Date(body.lastContactAt)
        : null;
    }
    if (data.status && !LEAD_STATUSES.includes(String(data.status) as (typeof LEAD_STATUSES)[number])) {
      return jsonError("Invalid lead status");
    }
    if (data.country === "India" && !data.state && !existing.state) {
      return jsonError("State is required for India");
    }
    if (data.country && data.country !== "India") data.state = null;

    const customerName = String(data.customerName ?? existing.customerName);
    const company = String(data.company ?? existing.company);
    const email = String(data.email ?? existing.email);
    const phone = String(data.phone ?? existing.phone);
    const country = String(data.country ?? existing.country);
    const state =
      data.state !== undefined
        ? (data.state as string | null)
        : existing.state;

    const customer = await upsertCustomer({
      email,
      customerName,
      company,
      phone,
      country,
      state,
    });
    if (customer) data.customerId = customer.id;

    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: { leadSource: true, assignedTo: true, projects: true },
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

    if (lead.status === "WON") {
      const project = await ensureProjectForLead(lead.id, user.id);
      if (!lead.projects.some((p) => p.id === project.id)) {
        await prisma.leadLog.create({
          data: {
            leadId: id,
            message: `Won — project ${project.projectNumber} ready`,
            createdById: user.id,
          },
        });
      }
    }

    return jsonOk(lead);
  } catch (error) {
    return handleRouteError(error);
  }
}
