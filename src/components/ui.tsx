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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-grey sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-panel border border-brand-line bg-white/95 p-5 shadow-panel ${className}`}
    >
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  tone?: "teal" | "orange" | "ink";
}) {
  const accents = {
    teal: "from-brand-teal/10 to-white border-brand-teal/20",
    orange: "from-brand-orange/10 to-white border-brand-orange/20",
    ink: "from-brand-ink/5 to-white border-brand-line",
  };
  return (
    <div
      className={`rounded-panel border bg-gradient-to-br p-4 shadow-soft ${accents[tone]}`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-grey">
        {label}
      </span>
      <strong className="mt-2 block font-display text-2xl font-semibold text-brand-ink">
        {value}
      </strong>
    </div>
  );
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
    <div className="rounded-panel border border-dashed border-brand-line bg-brand-soft/40 px-6 py-10 text-center">
      <h3 className="font-display text-xl font-semibold text-brand-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-brand-grey">{body}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn primary mt-4 inline-flex">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "orange" | "green" | "red";
}) {
  const map = {
    neutral: "bg-brand-soft text-brand-grey",
    teal: "bg-brand-teal/10 text-brand-teal",
    orange: "bg-brand-orange/15 text-brand-orange-deep",
    green: "bg-brand-ok/10 text-brand-ok",
    red: "bg-brand-danger/10 text-brand-danger",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function statusTone(
  status: string,
): "neutral" | "teal" | "orange" | "green" | "red" {
  const s = status.toUpperCase();
  if (
    ["WON", "ACCEPTED", "FINAL", "READY", "COMPLETED", "DOCUMENTS_COMPLETE"].includes(
      s,
    )
  )
    return "green";
  if (["LOST", "NEEDS_MORE", "REVOKED", "CLOSED"].includes(s)) return "red";
  if (
    [
      "QUALIFIED",
      "QUOTATION",
      "NEGOTIATION",
      "REVISION_REQUESTED",
      "SHARED",
      "WAITING",
      "CLIENT_ACTION",
      "AUTHORITY_PENDING",
      "DOCUMENTS_PENDING",
      "APPLICATION",
    ].includes(s)
  )
    return "orange";
  if (["NEW", "DRAFT", "CONTACTED", "TODO", "NOT_STARTED", "TESTING"].includes(s))
    return "teal";
  return "neutral";
}
