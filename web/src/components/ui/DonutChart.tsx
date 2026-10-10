"use client";

// Ink / clay / gold family plus muted neutrals; every value clears 3:1 against
// white (graphics threshold). Charts must also ship a text legend: color is never the only cue.
const COLORS = ["#1b1713", "#8e4028", "#b8862f", "#6e4f17", "#5c6b7a", "#7c8a6e", "#9b8377"];

export type DonutSegment = { label: string; value: number };

/** Custom SVG donut, no chart library needed. Segments are drawn as stroked
 * arcs via stroke-dasharray, colored from the brand palette (COLORS), in order. */
export function DonutChart({
  segments,
  size = 160,
  colors = COLORS,
}: {
  segments: DonutSegment[];
  size?: number;
  /** Override the default palette cycle, e.g. to match colors already
   * used elsewhere on the page for the same categories (Budget Planner). */
  colors?: string[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;

  // Precompute each arc's dash length and cumulative offset without
  // mutating anything during the render pass itself.
  const dashes = segments.map((s) => (total > 0 ? (s.value / total) * circumference : 0));
  const offsets = dashes.reduce<number[]>((acc, dash, i) => [...acc, i === 0 ? 0 : acc[i - 1] + dashes[i - 1]], []);

  const arcs = segments.map((s, i) => (
    <circle
      key={s.label}
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke={colors[i % colors.length]}
      strokeWidth={16}
      strokeDasharray={`${dashes[i]} ${circumference - dashes[i]}`}
      strokeDashoffset={-offsets[i]}
      strokeLinecap="butt"
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
      style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" }}
    />
  ));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Diagram donat: ${segments.map((s) => `${s.label} ${total > 0 ? Math.round((s.value / total) * 100) : 0}%`).join(", ")}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#efe8dc" strokeWidth={16} />
      {arcs}
    </svg>
  );
}

export { COLORS as CHART_COLORS };
