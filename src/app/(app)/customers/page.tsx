import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/constants";
import { BarChart } from "@/components/Charts";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: { select: { projects: true, quotes: true, leads: true } },
      projects: {
        where: { status: { notIn: ["COMPLETED", "CLOSED", "LOST"] } },
        select: { id: true },
      },
    },
    orderBy: [{ lifetimeValue: "desc" }, { updatedAt: "desc" }],
  });

  const top = customers.slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="One complete customer record across leads, quotes and delivery projects."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h2 className="font-display text-xl font-semibold text-brand-ink">
            Top customers by value
          </h2>
          <div className="mt-4">
            <BarChart
              labels={top.map((c) => c.company.slice(0, 18))}
              values={top.map((c) => Math.round(c.lifetimeValue))}
              color="#0A4A6C"
            />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold text-brand-ink">Snapshot</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-brand-soft p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
                Customers
              </div>
              <div className="mt-1 font-display text-3xl font-semibold">{customers.length}</div>
            </div>
            <div className="rounded-2xl bg-brand-orange/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
                Active projects
              </div>
              <div className="mt-1 font-display text-3xl font-semibold">
                {customers.reduce((s, c) => s + c.projects.length, 0)}
              </div>
            </div>
            <div className="col-span-2 rounded-2xl border border-brand-line p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
                Lifetime value
              </div>
              <div className="mt-1 font-display text-2xl font-semibold text-brand-teal">
                {formatINR(customers.reduce((s, c) => s + c.lifetimeValue, 0))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        {!customers.length ? (
          <EmptyState
            title="No customers yet"
            body="Customers are created automatically when you add leads or quotes."
            actionHref="/leads/new"
            actionLabel="Create lead"
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Active</th>
                  <th>Quotes</th>
                  <th>Lifetime value</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/customers/${c.id}`}>
                        <strong>{c.company}</strong>
                        <div className="muted">{c.email}</div>
                      </Link>
                    </td>
                    <td>
                      {c.customerName}
                      <div className="muted">{c.phone || "—"}</div>
                    </td>
                    <td>
                      <Badge tone={c.projects.length ? "orange" : "neutral"}>
                        {c.projects.length} projects
                      </Badge>
                    </td>
                    <td>{c._count.quotes}</td>
                    <td>{formatINR(c.lifetimeValue)}</td>
                    <td>
                      {c.lastActivityAt
                        ? format(c.lastActivityAt, "dd MMM yyyy")
                        : "—"}
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
