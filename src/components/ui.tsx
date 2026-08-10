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
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
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
  return <section className={`panel ${className}`}>{children}</section>;
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
  return (
    <div className={`stat tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
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
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn primary">
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
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function statusTone(status: string): "neutral" | "teal" | "orange" | "green" | "red" {
  const s = status.toUpperCase();
  if (["WON", "ACCEPTED", "FINAL", "READY"].includes(s)) return "green";
  if (["LOST", "NEEDS_MORE", "REVOKED"].includes(s)) return "red";
  if (["FOLLOW_UP", "REVISION_REQUESTED", "SHARED", "QUOTE_SENT"].includes(s))
    return "orange";
  if (["NEW", "DRAFT", "CONTACTED"].includes(s)) return "teal";
  return "neutral";
}
