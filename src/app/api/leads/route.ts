import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { notifyAdmins } from "@/lib/notifications";
import { upsertCustomer } from "@/lib/crm";
import { LEAD_STATUSES } from "@/lib/constants";

export async function GET() {
  try {
    await requireUser();
    const leads = await prisma.lead.findMany({
      include: {
        leadSource: true,
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { logs: true, quotes: true, projects: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk(leads);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const {
      customerName,
      company,
      companySize,
      email,
      phone,
      country,
      state,
      leadSourceId,
      notes,
      followUpAt,
      product,
      serviceName,
      expectedValue,
      expectedClose,
      assignedToId,
      status,
    } = body;

    if (
      !customerName ||
      !company ||
      !companySize ||
      !email ||
      !phone ||
      !country ||
      !leadSourceId
    ) {
      return jsonError("Missing required lead fields");
    }
    if (country === "India" && !state) {
      return jsonError("State is required for India");
    }
    if (status && !LEAD_STATUSES.includes(status)) {
      return jsonError("Invalid lead status");
    }

    const customer = await upsertCustomer({
      email,
      customerName,
      company,
      phone,
      country,
      state: country === "India" ? state : state || null,
    });

    const lead = await prisma.lead.create({
      data: {
        customerName,
        company,
        companySize,
        email,
        phone,
        country,
        state: country === "India" ? state : null,
        leadSourceId,
        notes: notes || null,
        product: product || null,
        serviceName: serviceName || null,
        expectedValue: Number(expectedValue || 0),
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        assignedToId: assignedToId || user.id,
        customerId: customer?.id || null,
        status: status || "NEW",
        followUpAt: followUpAt ? new Date(followUpAt) : null,
        createdById: user.id,
        logs: {
          create: {
            message: "Lead created",
            createdById: user.id,
          },
        },
      },
      include: { leadSource: true, assignedTo: true },
    });

    await notifyAdmins(
      "New lead created",
      `${lead.customerName} from ${lead.company} was added.`,
      `/leads/${lead.id}`,
    );

    return jsonOk(lead, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
