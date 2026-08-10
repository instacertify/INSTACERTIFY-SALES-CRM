import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel, Badge, statusTone } from "@/components/ui";
import { formatINR } from "@/lib/constants";
import { labelStatus } from "@/lib/crm";
import { BarChart } from "@/components/Charts";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          deliveryOwner: { select: { name: true } },
          commercialOwner: { select: { name: true } },
        },
      },
      quotes: { orderBy: { createdAt: "desc" }, take: 10 },
      leads: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!customer) notFound();

  const statusMap = new Map<string, number>();
  for (const p of customer.projects) {
    statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
  }

  return (
    <div>
      <PageHeader
        title={customer.company}
        subtitle={`${customer.customerName} · ${customer.email}${customer.phone ? ` · ${customer.phone}` : ""}`}
        actions={
          <>
            <Link href="/projects" className="btn ghost">
              All projects
            </Link>
            <Link href="/leads/new" className="btn primary">
              New lead
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
            Lifetime value
          </div>
          <div className="mt-2 font-display text-2xl font-semibold text-brand-teal">
            {formatINR(customer.lifetimeValue)}
          </div>
        </Panel>
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
            Projects
          </div>
          <div className="mt-2 font-display text-2xl font-semibold">
            {customer.projects.length}
          </div>
        </Panel>
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
            Quotes
          </div>
          <div className="mt-2 font-display text-2xl font-semibold">
            {customer.quotes.length}
          </div>
        </Panel>
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
            Status
          </div>
          <div className="mt-2">
            <Badge tone={customer.status === "ACTIVE" ? "green" : "neutral"}>
              {customer.status}
            </Badge>
          </div>
        </Panel>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-xl font-semibold">Projects by status</h2>
          <div className="mt-4">
            <BarChart
              labels={[...statusMap.keys()].map(labelStatus)}
              values={[...statusMap.values()]}
              color="#EB7D2D"
            />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl font-semibold">Projects</h2>
          <div className="mt-3 space-y-3">
            {customer.projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block rounded-2xl border border-brand-line p-3 transition hover:border-brand-teal"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong>{p.projectNumber}</strong>
                    <div className="text-sm text-brand-grey">{p.title}</div>
                    <div className="mt-1 text-xs text-brand-grey">
                      Sales: {p.commercialOwner?.name || "—"} · Delivery:{" "}
                      {p.deliveryOwner?.name || "—"}
                    </div>
                  </div>
                  <Badge tone={statusTone(p.status)}>{labelStatus(p.status)}</Badge>
                </div>
              </Link>
            ))}
            {!customer.projects.length ? (
              <p className="text-sm text-brand-grey">No projects yet.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel>
        <h2 className="font-display text-xl font-semibold">Recent quotes</h2>
        <div className="table-wrap mt-3">
          <table className="data">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Service</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {customer.quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/quotes/${q.id}`}>{q.quoteNumber}</Link>
                  </td>
                  <td>{q.serviceName}</td>
                  <td>
                    <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                  </td>
                  <td>{format(q.createdAt, "dd MMM yyyy")}</td>
                </tr>
              ))}
              {!customer.quotes.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No quotes yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
