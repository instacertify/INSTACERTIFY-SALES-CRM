import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone, EmptyState, Stat } from "@/components/ui";
import { formatINR } from "@/lib/constants";
import { labelStatus } from "@/lib/crm";
import { BarChart } from "@/components/Charts";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      commercialOwner: { select: { name: true } },
      deliveryOwner: { select: { name: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const active = projects.filter(
    (p) => !["COMPLETED", "CLOSED", "LOST"].includes(p.status),
  );
  const waiting = active.filter((p) => p.waitingFor);
  const statusMap = new Map<string, number>();
  for (const p of active) {
    statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="One delivery record per engagement — commercial owner, delivery owner, tasks and waiting blockers."
        actions={
          <Link href="/leads" className="btn primary">
            Create from lead
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active projects" value={active.length} tone="teal" />
        <Stat label="Waiting / blocked" value={waiting.length} tone="orange" />
        <Stat
          label="Pipeline value"
          value={formatINR(active.reduce((s, p) => s + p.projectValue, 0))}
          tone="ink"
        />
        <Stat
          label="Completed"
          value={projects.filter((p) => p.status === "COMPLETED").length}
          tone="teal"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <h2 className="font-display text-xl font-semibold">Project control</h2>
          <div className="mt-4">
            <BarChart
              labels={[...statusMap.keys()].map(labelStatus)}
              values={[...statusMap.values()]}
            />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold">Waiting on</h2>
          <div className="mt-3 space-y-2">
            {waiting.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-3 py-2"
              >
                <div>
                  <strong>{p.projectNumber}</strong>
                  <div className="text-xs text-brand-grey">{p.company}</div>
                </div>
                <Badge tone="orange">{p.waitingFor}</Badge>
              </Link>
            ))}
            {!waiting.length ? (
              <p className="text-sm text-brand-grey">No external blockers right now.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel>
        {!projects.length ? (
          <EmptyState
            title="No projects yet"
            body="Mark a lead as Won or accept a quote to create a project automatically."
            actionHref="/leads"
            actionLabel="Open leads"
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Commercial</th>
                  <th>Delivery</th>
                  <th>Value</th>
                  <th>Tasks</th>
                  <th>Expected</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const openTasks = p.tasks.filter((t) => t.status !== "COMPLETED").length;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/projects/${p.id}`}>
                          <strong>{p.projectNumber}</strong>
                          <div className="muted">{p.company}</div>
                        </Link>
                      </td>
                      <td>
                        <Badge tone={statusTone(p.status)}>{labelStatus(p.status)}</Badge>
                        {p.waitingFor ? (
                          <div className="muted">Waiting: {p.waitingFor}</div>
                        ) : null}
                      </td>
                      <td>{p.commercialOwner?.name || "—"}</td>
                      <td>{p.deliveryOwner?.name || "—"}</td>
                      <td>{formatINR(p.projectValue)}</td>
                      <td>{openTasks} open</td>
                      <td>
                        {p.expectedCompletion
                          ? format(p.expectedCompletion, "dd MMM yyyy")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
