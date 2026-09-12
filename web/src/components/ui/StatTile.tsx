import { Card } from "./Card";

const ACCENTS = { gold: "border-dc-gold", rose: "border-dc-rose", navy: "border-dc-navy" } as const;

/** Compact number tile for dashboards. `density: "soft"` (default, Client)
 * favors whitespace; `"structured"` (Internal/Admin, and the tables/tiles
 * in Vendor) adds a colored left border for faster scanning of many tiles
 * at once. Built on the shared Card, not a competing surface. */
export function StatTile({
  label,
  value,
  trend,
  density = "soft",
  accent = "navy",
}: {
  label: string;
  value: string | number;
  trend?: string;
  density?: "soft" | "structured";
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <Card
      className={`p-5 ${density === "structured" ? `rounded-lg border-l-4 ${ACCENTS[accent]}` : ""}`}
    >
      <p className="text-sm font-medium text-dc-black/60">{label}</p>
      <p className="mt-1 font-heading text-2xl font-extrabold text-dc-navy">{value}</p>
      {trend && <p className="mt-1 text-xs text-dc-black/50">{trend}</p>}
    </Card>
  );
}
