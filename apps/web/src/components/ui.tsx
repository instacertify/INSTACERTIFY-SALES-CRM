import { cn } from "@/lib/utils";
import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-brand-grey">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-brand-line bg-white/90 p-5 shadow-panel backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "orange" | "green" | "red";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    teal: "bg-brand-teal/10 text-brand-teal",
    orange: "bg-brand-orange/15 text-brand-orange",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(
  status: string,
): "neutral" | "teal" | "orange" | "green" | "red" {
  const s = status.toUpperCase();
  if (["WON", "ACCEPTED", "COMPLETED", "PAID", "GRANTED"].includes(s))
    return "green";
  if (["LOST", "REJECTED", "FAILED", "CLOSED"].includes(s)) return "red";
  if (
    ["QUOTATION", "NEGOTIATION", "WAITING", "TESTING", "CLIENT_ACTION"].includes(
      s,
    )
  )
    return "orange";
  if (["NEW", "CONTACTED", "TODO", "NOT_STARTED"].includes(s)) return "teal";
  return "neutral";
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-brand-line bg-brand-soft/40 px-6 py-10 text-center">
      <h3 className="font-display text-lg font-semibold text-brand-ink">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-brand-grey">{body}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-brand-line bg-gradient-to-br from-white to-brand-soft/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-grey">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-brand-ink">
        {value}
      </p>
    </div>
  );
}
