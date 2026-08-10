import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { refreshCustomerMetrics } from "@/lib/crm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        commercialOwner: true,
        deliveryOwner: true,
        lead: true,
        quote: true,
        customer: true,
        tasks: { orderBy: [{ sequence: "asc" }, { createdAt: "asc" }], include: { assignedTo: true } },
        remarks: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: true },
          take: 40,
        },
      },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {
      lastActivityAt: new Date(),
    };
    const fields = [
      "title",
      "status",
      "serviceName",
      "projectValue",
      "waitingFor",
      "waitingNote",
      "scopeSummary",
      "commercialOwnerId",
      "deliveryOwnerId",
    ] as const;
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.expectedCompletion !== undefined) {
      data.expectedCompletion = body.expectedCompletion
        ? new Date(body.expectedCompletion)
        : null;
    }
    if (body.waitingExpectedOn !== undefined) {
      data.waitingExpectedOn = body.waitingExpectedOn
        ? new Date(body.waitingExpectedOn)
        : null;
    }
    if (body.startDate !== undefined) {
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    }

    const project = await prisma.project.update({ where: { id }, data });

    if (body.remark) {
      await prisma.projectRemark.create({
        data: {
          projectId: id,
          remark: body.remark,
          stage: body.stage || "Other",
          createdById: user.id,
        },
      });
    }

    if (project.customerId) await refreshCustomerMetrics(project.customerId);
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
