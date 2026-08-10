import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { upsertCustomer, refreshCustomerMetrics } from "@/lib/crm";

export async function GET() {
  try {
    await requireUser();
    const customers = await prisma.customer.findMany({
      include: {
        _count: { select: { projects: true, leads: true, quotes: true } },
        projects: {
          where: { status: { notIn: ["COMPLETED", "CLOSED", "LOST"] } },
          select: { id: true },
        },
      },
      orderBy: [{ lifetimeValue: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({
      customers: customers.map((c) => ({
        ...c,
        activeProjects: c.projects.length,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();
    const customer = await upsertCustomer({
      email: body.email,
      customerName: body.customerName,
      company: body.company,
      phone: body.phone,
      country: body.country,
      state: body.state,
    });
    if (!customer) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (body.notes) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { notes: body.notes },
      });
    }
    await refreshCustomerMetrics(customer.id);
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
