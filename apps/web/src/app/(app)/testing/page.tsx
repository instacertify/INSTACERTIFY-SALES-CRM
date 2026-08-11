"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { PageHeader, Panel, Badge } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  scope: string;
  standardCode?: string | null;
  purchasePrice: number;
  salesPrice: number;
  turnaroundDays: number;
  partnerLab?: {
    id: string;
    name: string;
    scope: string;
    nabl: boolean;
    city?: string | null;
  } | null;
};

type Lab = {
  id: string;
  name: string;
  scope: string;
  nabl: boolean;
  city?: string | null;
  _count?: { catalogItems: number };
};

export default function TestingCatalogPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(term = q) {
    setLoading(true);
    setError("");
    try {
      const [catalog, labRows] = await Promise.all([
        api<CatalogItem[]>(`/catalog/testing?q=${encodeURIComponent(term)}`),
        api<Lab[]>(`/catalog/labs?q=${encodeURIComponent(term)}`),
      ]);
      setItems(catalog);
      setLabs(labRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search("");
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    search(q);
  }

  return (
    <div>
      <PageHeader
        title="Testing & lab catalog"
        subtitle="Search lab scope and see purchase cost vs the price you should sell at."
      />

      <Panel className="mb-4">
        <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search EMI, RoHS, IEC 62368, lab name, scope…"
            className="w-full rounded-xl border border-brand-line px-3 py-2.5 text-sm"
          />
          <button className="rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white">
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <h2 className="font-display text-lg font-semibold">
            Sellable tests ({items.length})
          </h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-brand-line px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-brand-grey">
                      {item.standardCode || item.category} ·{" "}
                      {item.partnerLab?.name || "Lab TBD"}
                      {item.partnerLab?.nabl ? " · NABL" : ""}
                    </p>
                  </div>
                  <Badge tone="teal">{item.category}</Badge>
                </div>
                <p className="mt-2 text-sm text-brand-ink/80">{item.scope}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-brand-soft/70 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-brand-grey">
                      Purchase
                    </p>
                    <p className="font-semibold">{formatINR(item.purchasePrice)}</p>
                  </div>
                  <div className="rounded-lg bg-brand-orange/10 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-brand-orange">
                      Sell at
                    </p>
                    <p className="font-semibold text-brand-orange">
                      {formatINR(item.salesPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-brand-soft/70 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-brand-grey">
                      Margin
                    </p>
                    <p className="font-semibold">
                      {formatINR(item.salesPrice - item.purchasePrice)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-brand-grey">
                  TAT ~ {item.turnaroundDays} days
                </p>
              </div>
            ))}
            {!items.length ? (
              <p className="text-sm text-brand-grey">No matching tests.</p>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-lg font-semibold">Lab scopes</h2>
          <div className="mt-4 space-y-3">
            {labs.map((lab) => (
              <div
                key={lab.id}
                className="rounded-xl border border-brand-line px-3 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong>{lab.name}</strong>
                  {lab.nabl ? <Badge tone="green">NABL</Badge> : null}
                </div>
                <p className="mt-1 text-brand-grey">
                  {lab.city || "—"} · {lab._count?.catalogItems || 0} tests
                </p>
                <p className="mt-2">{lab.scope || "Scope not set"}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
