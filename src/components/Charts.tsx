export function BarChart({
  labels,
  values,
  color = "#0A4A6C",
}: {
  labels: string[];
  values: number[];
  color?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="space-y-3">
      {labels.map((label, i) => {
        const pct = Math.round((values[i] / max) * 100);
        return (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold">
              <span className="text-brand-ink">{label}</span>
              <span className="text-brand-grey">{values[i]}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-brand-soft">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
      {!labels.length ? (
        <p className="text-sm text-brand-grey">No chart data yet.</p>
      ) : null}
    </div>
  );
}

export function LineChart({
  labels,
  series,
}: {
  labels: string[];
  series: { name: string; values: number[]; color: string }[];
}) {
  const width = 640;
  const height = 220;
  const pad = 28;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const stepX = labels.length > 1 ? (width - pad * 2) / (labels.length - 1) : 0;

  function points(values: number[]) {
    return values
      .map((v, i) => {
        const x = pad + i * stepX;
        const y = height - pad - (v / max) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = height - pad - t * (height - pad * 2);
          return (
            <line
              key={t}
              x1={pad}
              x2={width - pad}
              y1={y}
              y2={y}
              stroke="#D7E2EA"
              strokeWidth="1"
            />
          );
        })}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points(s.values)}
            />
            {s.values.map((v, i) => {
              const x = pad + i * stepX;
              const y = height - pad - (v / max) * (height - pad * 2);
              return <circle key={`${s.name}-${i}`} cx={x} cy={y} r="3.5" fill={s.color} />;
            })}
          </g>
        ))}
        {labels.map((label, i) => {
          if (i % Math.ceil(labels.length / 7) !== 0 && i !== labels.length - 1) return null;
          const x = pad + i * stepX;
          return (
            <text
              key={label + i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#5F5E6B"
            >
              {label}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-xs font-semibold text-brand-grey">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
