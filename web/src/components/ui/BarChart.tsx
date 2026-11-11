"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/motion";

export type BarDatum = { label: string; value: number };

/** Custom SVG bar chart, no chart library needed. Bars are proportional
 * <rect>s inside a viewBox, sized against the largest value in data. */
export function BarChart({ data, height = 160, color = "var(--dc-chart-2)" }: { data: BarDatum[]; height?: number; color?: string }) {
  // Bars grow from the baseline once on mount (and ease to new values later).
  const reduced = useReducedMotion();
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const show = grown || !!reduced;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-label="Diagram batang">
        {data.map((d, i) => {
          const barHeight = show ? (d.value / max) * (height - 24) : 0;
          return (
            <rect
              key={d.label}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              fill={color}
              rx={1.2}
              style={{ transition: reduced ? undefined : `height 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s, y 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s` }}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-dc-text-3">
        {data.map((d) => (
          <span key={d.label} className="flex min-w-0 flex-col items-center text-center" style={{ width: `${barWidth}%` }}>
            <span className="font-semibold tabular-nums text-dc-ink">{d.value}</span>
            <span className="w-full truncate">{d.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
