import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone, EmptyState, Stat } from "@/components/ui";
import { labelStatus } from "@/lib/crm";

export default async function TasksPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await prisma.projectTask.findMany({
    include: {
      project: { select: { id: true, projectNumber: true, company: true, title: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const open = tasks.filter((t) => t.status !== "COMPLETED");
  const waiting = open.filter((t) => t.status === "WAITING");
  const dueToday = open.filter(
    (t) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow,
  );
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Day-to-day work on projects. Use Waiting when blocked by client, lab, government, payment or sample."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open tasks" value={open.length} tone="teal" />
        <Stat label="Due today" value={dueToday.length} tone="orange" />
        <Stat label="Overdue" value={overdue.length} tone="ink" />
        <Stat label="Waiting" value={waiting.length} tone="orange" />
      </div>

      <Panel>
        {!tasks.length ? (
          <EmptyState
            title="No tasks yet"
            body="Open a project and add tasks like Collect documents, Submit application, Arrange sample."
            actionHref="/projects"
            actionLabel="Open projects"
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Person</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                      {t.status === "WAITING" && t.waitingFor ? (
                        <div className="muted">Waiting for {t.waitingFor}</div>
                      ) : null}
                    </td>
                    <td>
                      <Link href={`/projects/${t.project.id}`}>
                        {t.project.projectNumber}
                        <div className="muted">{t.project.company}</div>
                      </Link>
                    </td>
                    <td>{t.assignedTo?.name || "—"}</td>
                    <td>{t.dueDate ? format(t.dueDate, "dd MMM yyyy") : "—"}</td>
                    <td>
                      <Badge tone={statusTone(t.status)}>{labelStatus(t.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
