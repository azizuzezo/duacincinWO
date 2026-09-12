"use client";

export type BarDatum = { label: string; value: number };

/** Custom SVG bar chart, no chart library needed. Bars are proportional
 * <rect>s inside a viewBox, sized against the largest value in data. */
export function BarChart({ data, height = 160, color = "#831843" }: { data: BarDatum[]; height?: number; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-label="Diagram batang">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 24);
          return (
            <rect
              key={d.label}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              fill={color}
              rx={2}
              style={{ transition: "height 0.6s cubic-bezier(0.16,1,0.3,1), y 0.6s cubic-bezier(0.16,1,0.3,1)" }}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-dc-black/50">
        {data.map((d) => (
          <span key={d.label} className="truncate" style={{ width: `${barWidth}%` }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
