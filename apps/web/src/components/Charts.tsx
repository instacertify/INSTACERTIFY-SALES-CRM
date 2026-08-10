"use client";

import { cn } from "@/lib/utils";

const PALETTE = [
  "#0A4A6C",
  "#EB7D2D",
  "#2F6F4E",
  "#8B4D6B",
  "#3D6B8C",
  "#C45C26",
  "#5F5E6B",
  "#1F7A6D",
];

export function PieChart({
  data,
  size = 180,
  className,
}: {
  data: Record<string, number>;
  size?: number;
  className?: string;
}) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  let angle = -90;
  const slices = entries.map(([label, value], i) => {
    const sweep = (value / total) * 360;
    const start = angle;
    angle += sweep;
    return { label, value, start, sweep, color: PALETTE[i % PALETTE.length] };
  });

  function arc(startDeg: number, sweepDeg: number) {
    if (sweepDeg >= 359.9) {
      const r = size / 2 - 4;
      return `M ${size / 2} ${size / 2 - r} A ${r} ${r} 0 1 1 ${size / 2 - 0.01} ${size / 2 - r} A ${r} ${r} 0 1 1 ${size / 2} ${size / 2 - r}`;
    }
    const r = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;
    const toRad = (d: number) => (Math.PI / 180) * d;
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(startDeg + sweepDeg));
    const y2 = cy + r * Math.sin(toRad(startDeg + sweepDeg));
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  if (!entries.length) {
    return (
      <p className="text-sm text-brand-grey">No chart data yet.</p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => (
          <path key={s.label} d={arc(s.start, s.sweep)} fill={s.color} />
        ))}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.22}
          fill="white"
        />
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-brand-ink">
              {s.label.replaceAll("_", " ")}
            </span>
            <strong className="ml-auto pl-3">{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBars({
  data,
  formatValue,
}: {
  data: Array<{ label: string; value: number }>;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">{d.label}</span>
            <span className="text-brand-grey">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-soft">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </div>
      ))}
      {!data.length ? (
        <p className="text-sm text-brand-grey">No sales yet.</p>
      ) : null}
    </div>
  );
}
