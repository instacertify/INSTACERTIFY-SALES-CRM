import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/constants";
import { labelStatus } from "@/lib/crm";
import { ProjectControls } from "@/components/ProjectControls";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, users] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        commercialOwner: true,
        deliveryOwner: true,
        customer: true,
        lead: true,
        quote: true,
        tasks: {
          orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
          include: { assignedTo: true },
        },
        remarks: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: true },
          take: 30,
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!project) notFound();

  const done = project.tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div>
      <PageHeader
        title={project.projectNumber}
        subtitle={`${project.company} · ${project.serviceName || "Service"} · ${project.title}`}
        actions={
          <>
            {project.customerId ? (
              <Link href={`/customers/${project.customerId}`} className="btn ghost">
                Customer
              </Link>
            ) : null}
            {project.quoteId ? (
              <Link href={`/quotes/${project.quoteId}`} className="btn ghost">
                Quote
              </Link>
            ) : null}
            {project.leadId ? (
              <Link href={`/leads/${project.leadId}`} className="btn primary">
                Lead
              </Link>
            ) : null}
          </>
        }
      />

      <div className="mb-6 rounded-panel border border-brand-teal/20 bg-hero-teal p-5 text-white shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/70">Status</div>
            <div className="mt-1 text-lg font-bold">{labelStatus(project.status)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/70">Value</div>
            <div className="mt-1 text-lg font-bold">{formatINR(project.projectValue)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/70">Commercial owner</div>
            <div className="mt-1 text-lg font-bold">
              {project.commercialOwner?.name || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/70">Delivery owner</div>
            <div className="mt-1 text-lg font-bold">
              {project.deliveryOwner?.name || "—"}
            </div>
          </div>
        </div>
        {project.waitingFor ? (
          <div className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm">
            Waiting for <strong>{project.waitingFor}</strong>
            {project.waitingExpectedOn
              ? ` · expected ${format(project.waitingExpectedOn, "dd MMM yyyy")}`
              : ""}
            {project.waitingNote ? ` — ${project.waitingNote}` : ""}
          </div>
        ) : null}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Tasks ({done}/{project.tasks.length})
            </h2>
            <Link href="/tasks" className="btn ghost small">
              All tasks
            </Link>
          </div>
          <div className="space-y-2">
            {project.tasks.map((t) => {
              const mark =
                t.status === "COMPLETED" ? "✓" : t.status === "WAITING" || t.status === "IN_PROGRESS" ? "→" : "○";
              return (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-brand-line px-3 py-2"
                >
                  <div>
                    <div className="font-semibold">
                      {mark} {t.title}
                    </div>
                    <div className="text-xs text-brand-grey">
                      {t.assignedTo?.name || "Unassigned"}
                      {t.dueDate ? ` · due ${format(t.dueDate, "dd MMM")}` : ""}
                      {t.status === "WAITING" && t.waitingFor
                        ? ` · waiting ${t.waitingFor}`
                        : ""}
                    </div>
                  </div>
                  <Badge tone={statusTone(t.status)}>{labelStatus(t.status)}</Badge>
                </div>
              );
            })}
            {!project.tasks.length ? (
              <p className="text-sm text-brand-grey">No tasks yet — add one below.</p>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-xl font-semibold">Timeline</h2>
          <div className="mt-3 space-y-3">
            {project.remarks.map((r) => (
              <div
                key={r.id}
                className="border-l-4 border-brand-orange pl-3 text-sm"
              >
                <div className="text-xs text-brand-grey">
                  {format(r.createdAt, "dd MMM yyyy HH:mm")} · {r.createdBy.name} ·{" "}
                  {r.stage}
                </div>
                <div>{r.remark}</div>
              </div>
            ))}
            {!project.remarks.length ? (
              <p className="text-sm text-brand-grey">No communications logged yet.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <ProjectControls project={project} users={users} />
    </div>
  );
}
