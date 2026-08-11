"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  statusTone,
  Button,
  Field,
  inputClass,
} from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Line = {
  id: string;
  kind: string;
  title: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  amount: number;
};

type Quote = {
  id: string;
  quoteNumber: string;
  company: string;
  customerName: string;
  email: string;
  phone: string;
  serviceName: string;
  description: string;
  status: string;
  consultingPrice: number;
  testingPrice: number;
  otherCommercials: number;
  governmentFees: number;
  lineItems: Line[];
  events: { id: string; event: string; note?: string; createdAt: string }[];
  projects: { id: string; projectNumber: string }[];
  invoices: { id: string; invoiceNumber: string }[];
};

type CatalogItem = {
  id: string;
  name: string;
  salesPrice: number;
  purchasePrice: number;
};

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = () =>
    api<Quote>(`/quotations/${id}`)
      .then(setQuote)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api<CatalogItem[]>("/catalog/testing")
      .then(setCatalog)
      .catch(() => undefined);
  }, [id]);

  async function run(action: string, path: string, body?: unknown) {
    setBusy(action);
    setError("");
    try {
      const res = await api<Record<string, unknown>>(path, {
        method: path.includes("accept") ? "POST" : "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (action === "accept" && res.project) {
        const project = res.project as { id: string };
        router.push(`/projects/${project.id}`);
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  async function addLine(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const catalogItemId = String(fd.get("catalogItemId") || "");
    setBusy("line");
    try {
      await api(`/quotations/${id}/line-items`, {
        method: "POST",
        body: JSON.stringify({
          kind: catalogItemId ? "TESTING" : fd.get("kind") || "CONSULTING",
          title: fd.get("title"),
          quantity: Number(fd.get("quantity") || 1),
          unitPrice: Number(fd.get("unitPrice") || 0),
          purchasePrice: Number(fd.get("purchasePrice") || 0),
          catalogItemId: catalogItemId || undefined,
        }),
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Line failed");
    } finally {
      setBusy("");
    }
  }

  if (!quote && !error) {
    return <p className="text-sm text-brand-grey">Loading quotation…</p>;
  }
  if (!quote) return <p className="text-rose-600">{error}</p>;

  const total =
    quote.consultingPrice +
    quote.testingPrice +
    quote.otherCommercials +
    quote.governmentFees;

  return (
    <div>
      <PageHeader
        title={quote.quoteNumber}
        subtitle={`${quote.company} · ${quote.serviceName}`}
        actions={
          <>
            <Badge tone={statusTone(quote.status)}>{quote.status}</Badge>
            <Button
              type="button"
              variant="secondary"
              disabled={!!busy}
              onClick={() => run("share", `/quotations/${id}/share`)}
            >
              Share
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!!busy}
              onClick={() =>
                run("testing", `/quotations/${id}/testing-opted`, {
                  note: "Testing opted",
                })
              }
            >
              Mark testing opted
            </Button>
            <Button
              type="button"
              disabled={!!busy || quote.status === "ACCEPTED"}
              onClick={() =>
                run("accept", `/quotations/${id}/accept`, {
                  createInvoice: true,
                })
              }
            >
              {busy === "accept" ? "Accepting…" : "Accept → Project"}
            </Button>
          </>
        }
      />
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel>
          <p className="text-xs font-semibold uppercase text-brand-grey">
            Contact
          </p>
          <p className="mt-2 font-semibold">{quote.customerName}</p>
          <p className="text-sm text-brand-grey">{quote.email}</p>
          <p className="text-sm text-brand-grey">{quote.phone}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase text-brand-grey">
            Commercials
          </p>
          <p className="mt-2 text-sm">Consulting {formatINR(quote.consultingPrice)}</p>
          <p className="text-sm">Testing {formatINR(quote.testingPrice)}</p>
          <p className="text-sm">Govt {formatINR(quote.governmentFees)}</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {formatINR(total)}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase text-brand-grey">
            Linked
          </p>
          {quote.projects[0] ? (
            <Link
              className="mt-2 block font-semibold text-brand-teal"
              href={`/projects/${quote.projects[0].id}`}
            >
              Project {quote.projects[0].projectNumber}
            </Link>
          ) : (
            <p className="mt-2 text-sm text-brand-grey">No project yet</p>
          )}
          {quote.invoices[0] ? (
            <Link
              className="mt-1 block font-semibold text-brand-teal"
              href={`/invoices/${quote.invoices[0].id}`}
            >
              Invoice {quote.invoices[0].invoiceNumber}
            </Link>
          ) : null}
        </Panel>
      </div>

      <Panel className="mb-4">
        <h2 className="font-display text-lg font-semibold">Line items</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-brand-line text-brand-grey">
              <tr>
                <th className="py-2">Kind</th>
                <th className="py-2">Title</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Sell</th>
                <th className="py-2">Cost</th>
                <th className="py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((l) => (
                <tr key={l.id} className="border-b border-brand-line/60">
                  <td className="py-2">{l.kind}</td>
                  <td>{l.title}</td>
                  <td>{l.quantity}</td>
                  <td>{formatINR(l.unitPrice)}</td>
                  <td>{formatINR(l.purchasePrice)}</td>
                  <td>{formatINR(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          onSubmit={addLine}
          className="mt-4 grid gap-3 border-t border-brand-line pt-4 sm:grid-cols-2 lg:grid-cols-6"
        >
          <Field label="From catalog">
            <select name="catalogItemId" className={inputClass} defaultValue="">
              <option value="">— Manual —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({formatINR(c.salesPrice)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kind">
            <select name="kind" className={inputClass} defaultValue="CONSULTING">
              <option value="CONSULTING">Consulting</option>
              <option value="TESTING">Testing</option>
              <option value="GOVERNMENT">Government</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Title">
            <input name="title" required className={inputClass} />
          </Field>
          <Field label="Qty">
            <input name="quantity" type="number" defaultValue={1} className={inputClass} />
          </Field>
          <Field label="Unit price">
            <input name="unitPrice" type="number" defaultValue={0} className={inputClass} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={busy === "line"}>
              Add line
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <h2 className="font-display text-lg font-semibold">Journey</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {quote.events.map((ev) => (
            <li key={ev.id} className="flex gap-3 border-b border-brand-line/50 py-2">
              <Badge tone={statusTone(ev.event)}>{ev.event}</Badge>
              <span className="text-brand-grey">
                {new Date(ev.createdAt).toLocaleString()}
              </span>
              <span>{ev.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-brand-grey">{quote.description}</p>
      </Panel>
    </div>
  );
}
