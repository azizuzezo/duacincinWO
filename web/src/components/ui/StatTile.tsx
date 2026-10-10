import { Card } from "./Card";

const ACCENTS = { gold: "border-t-dc-gold", clay: "border-t-dc-clay", ink: "border-t-dc-ink" } as const;

/** Compact number tile for dashboards. `density: "structured"` adds a 2px top
 * rule in the accent color so many tiles scan quickly; "soft" stays plain.
 * Value is sans with tabular figures: the display serif's numerals read worse
 * at a glance for currency and counts. */
export function StatTile({
  label,
  value,
  trend,
  density = "soft",
  accent = "ink",
}: {
  label: string;
  value: string | number;
  trend?: string;
  density?: "soft" | "structured";
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <Card className={`p-5 ${density === "structured" ? `border-t-2 ${ACCENTS[accent]}` : ""}`}>
      <p className="text-sm font-medium text-dc-black/70">{label}</p>
      <p className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight text-dc-ink">{value}</p>
      {trend && <p className="mt-1 text-xs text-dc-black/60">{trend}</p>}
    </Card>
  );
}
