import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    for (const f of ["title", "status", "waitingFor", "waitingNote", "notes", "assignedToId", "sequence"] as const) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.waitingExpectedOn !== undefined) {
      data.waitingExpectedOn = body.waitingExpectedOn
        ? new Date(body.waitingExpectedOn)
        : null;
    }
    if (body.status === "COMPLETED") data.completedAt = new Date();
    if (body.status && body.status !== "COMPLETED") data.completedAt = null;
    if (body.status && body.status !== "WAITING") {
      // keep waiting fields for history unless explicitly cleared
    }

    const task = await prisma.projectTask.update({ where: { id }, data });

    if (task.status === "WAITING" && task.waitingFor) {
      await prisma.project.update({
        where: { id: task.projectId },
        data: {
          waitingFor: task.waitingFor,
          waitingExpectedOn: task.waitingExpectedOn,
          waitingNote: task.waitingNote,
          lastActivityAt: new Date(),
        },
      });
    } else {
      await prisma.project.update({
        where: { id: task.projectId },
        data: { lastActivityAt: new Date() },
      });
    }

    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
