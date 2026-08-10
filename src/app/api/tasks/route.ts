import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;

    const tasks = await prisma.projectTask.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        project: { select: { id: true, title: true, projectNumber: true, company: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { sequence: "asc" }],
    });
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();
    if (!body.projectId || !body.title) {
      return NextResponse.json({ error: "projectId and title required" }, { status: 400 });
    }

    const task = await prisma.projectTask.create({
      data: {
        projectId: body.projectId,
        title: body.title,
        status: body.status || "TODO",
        waitingFor: body.status === "WAITING" ? body.waitingFor : null,
        waitingNote: body.waitingNote || null,
        waitingExpectedOn: body.waitingExpectedOn
          ? new Date(body.waitingExpectedOn)
          : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedToId: body.assignedToId || null,
        sequence: Number(body.sequence || 10),
        notes: body.notes || null,
        completedAt: body.status === "COMPLETED" ? new Date() : null,
      },
    });

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
