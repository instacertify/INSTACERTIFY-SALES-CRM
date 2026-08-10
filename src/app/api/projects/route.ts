import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  ensureProjectForLead,
  ensureProjectForQuote,
  nextProjectNumber,
  upsertCustomer,
  refreshCustomerMetrics,
} from "@/lib/crm";

export async function GET() {
  try {
    await requireUser();
    const projects = await prisma.project.findMany({
      include: {
        commercialOwner: { select: { id: true, name: true } },
        deliveryOwner: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
        tasks: {
          where: { status: { not: "COMPLETED" } },
          select: { id: true, status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    if (body.leadId) {
      const project = await ensureProjectForLead(body.leadId, user.id);
      return NextResponse.json({ project });
    }
    if (body.quoteId) {
      const project = await ensureProjectForQuote(body.quoteId);
      return NextResponse.json({ project });
    }

    const customer = await upsertCustomer({
      email: body.email,
      customerName: body.customerName,
      company: body.company,
      phone: body.phone,
      country: body.country,
      state: body.state,
    });

    const project = await prisma.project.create({
      data: {
        projectNumber: await nextProjectNumber(),
        title: body.title || `${body.company} — ${body.serviceName || "Project"}`,
        status: body.status || "NOT_STARTED",
        serviceName: body.serviceName,
        projectValue: Number(body.projectValue || 0),
        expectedCompletion: body.expectedCompletion
          ? new Date(body.expectedCompletion)
          : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        customerId: customer?.id,
        commercialOwnerId: body.commercialOwnerId || user.id,
        deliveryOwnerId: body.deliveryOwnerId || user.id,
        customerName: body.customerName,
        company: body.company,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        scopeSummary: body.scopeSummary,
        waitingFor: body.waitingFor || null,
        waitingNote: body.waitingNote || null,
      },
    });

    if (customer) await refreshCustomerMetrics(customer.id);
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
