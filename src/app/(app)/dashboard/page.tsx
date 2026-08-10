import Link from "next/link";
import { format, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader, Panel, Stat, Badge, statusTone } from "@/components/ui";
import { formatINR, quoteRevenue, ACTIVE_LEAD_STATUSES } from "@/lib/constants";
import { labelStatus } from "@/lib/crm";
import { BarChart, LineChart } from "@/components/Charts";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const start = subDays(new Date(), 13);
  start.setHours(0, 0, 0, 0);

  const [
    leadCount,
    followUps,
    acceptedQuotes,
    quotes,
    notifications,
    customers,
    projects,
    tasks,
    recentLeads,
    recentQuotes,
    recentProjects,
    completedTasks,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.findMany({
      where: {
        OR: [
          { followUpAt: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2) } },
          { status: { in: ["QUALIFIED", "QUOTATION", "NEGOTIATION"] } },
        ],
        status: { notIn: ["WON", "LOST"] },
      },
      include: { leadSource: true },
      orderBy: { followUpAt: "asc" },
      take: 8,
    }),
    prisma.quote.count({ where: { status: "ACCEPTED" } }),
    prisma.quote.findMany({ orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.customer.count(),
    prisma.project.findMany({
      where: { status: { notIn: ["COMPLETED", "CLOSED", "LOST"] } },
      select: { status: true, projectValue: true, waitingFor: true },
    }),
    prisma.projectTask.findMany({
      where: { status: { not: "COMPLETED" } },
      select: { dueDate: true, status: true },
    }),
    prisma.lead.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    prisma.quote.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    prisma.project.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    prisma.projectTask.findMany({
      where: { completedAt: { gte: start }, status: "COMPLETED" },
      select: { completedAt: true },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasksDueToday = tasks.filter(
    (t) => t.dueDate && t.dueDate >= today && t.dueDate < new Date(today.getTime() + 86400000),
  ).length;
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < today).length;
  const waitingProjects = projects.filter((p) => p.waitingFor).length;
  const revenue = quotes.reduce((sum, q) => sum + quoteRevenue(q), 0);

  const labels: string[] = [];
  const leadSeries: number[] = [];
  const quoteSeries: number[] = [];
  const projectSeries: number[] = [];
  const taskSeries: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const key = format(d, "yyyy-MM-dd");
    labels.push(format(d, "dd MMM"));
    leadSeries.push(recentLeads.filter((x) => format(x.createdAt, "yyyy-MM-dd") === key).length);
    quoteSeries.push(recentQuotes.filter((x) => format(x.createdAt, "yyyy-MM-dd") === key).length);
    projectSeries.push(
      recentProjects.filter((x) => format(x.createdAt, "yyyy-MM-dd") === key).length,
    );
    taskSeries.push(
      completedTasks.filter(
        (x) => x.completedAt && format(x.completedAt, "yyyy-MM-dd") === key,
      ).length,
    );
  }

  const statusMap = new Map<string, number>();
  for (const p of projects) {
    statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Good day, ${session?.user.name}. One place for leads, sales, delivery projects and daily progress.`}
        actions={
          <>
            <Link href="/leads/new" className="btn accent">
              Create Lead
            </Link>
            <Link href="/quotes/new" className="btn primary">
              Create Quote
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Customers" value={customers} tone="teal" />
        <Stat label="Active projects" value={projects.length} tone="orange" />
        <Stat label="Follow-ups due" value={followUps.length} tone="ink" />
        <Stat label="Accepted quotes" value={acceptedQuotes} tone="teal" />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tasks due today" value={tasksDueToday} tone="orange" />
        <Stat label="Overdue tasks" value={overdueTasks} tone="ink" />
        <Stat label="Waiting / blocked" value={waitingProjects} tone="orange" />
        <Stat label="Recent quote value" value={formatINR(revenue)} tone="teal" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <h2 className="font-display text-xl font-semibold">Daily progress (14 days)</h2>
          <div className="mt-4">
            <LineChart
              labels={labels}
              series={[
                { name: "Leads", values: leadSeries, color: "#0A4A6C" },
                { name: "Quotes", values: quoteSeries, color: "#EB7D2D" },
                { name: "Projects", values: projectSeries, color: "#2E8B57" },
                { name: "Tasks done", values: taskSeries, color: "#5B7C99" },
              ]}
            />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold">Project control</h2>
          <div className="mt-4">
            <BarChart
              labels={[...statusMap.keys()].map(labelStatus)}
              values={[...statusMap.values()]}
              color="#EB7D2D"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/projects" className="btn ghost small">
              Projects
            </Link>
            <Link href="/tasks" className="btn ghost small">
              Tasks
            </Link>
            <Link href="/customers" className="btn ghost small">
              Customers
            </Link>
          </div>
        </Panel>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-xl font-semibold">Follow-ups</h2>
          <div className="table-wrap mt-3">
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Follow up</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/leads/${lead.id}`}>
                        <strong>{lead.customerName}</strong>
                        <div className="muted">{lead.company}</div>
                      </Link>
                    </td>
                    <td>
                      <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td>
                      {lead.followUpAt ? format(lead.followUpAt, "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                ))}
                {!followUps.length ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No follow-ups pending.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-xl font-semibold">Notifications</h2>
          <div className="mt-3 space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border px-3 py-2 ${
                  n.read ? "border-brand-line bg-white" : "border-brand-orange/30 bg-brand-orange/5"
                }`}
              >
                <strong>{n.title}</strong>
                <div className="text-sm text-brand-grey">{n.message}</div>
                {n.link ? (
                  <Link href={n.link} className="btn ghost small mt-2">
                    Open
                  </Link>
                ) : null}
              </div>
            ))}
            {!notifications.length ? (
              <p className="text-sm text-brand-grey">No notifications yet.</p>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-brand-grey">
            Active lead pipeline statuses: {ACTIVE_LEAD_STATUSES.join(" · ")}
          </p>
        </Panel>
      </div>
    </div>
  );
}
