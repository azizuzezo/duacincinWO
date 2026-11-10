import { Card } from "./Card";
import { CountUp } from "./Motion";

const ACCENTS = { gold: "before:bg-dc-gold", clay: "before:bg-dc-clay", ink: "before:bg-dc-ink" } as const;

/** Number tile for dashboards. The value is the display serif with lining,
 * tabular figures so counts and rupiah line up. `density: "structured"` adds a
 * short accent rule above the label so many tiles scan quickly. Only show real
 * numbers from the API (no placeholders). */
export function StatTile({
  label,
  value,
  trend,
  density = "soft",
  accent = "gold",
  className = "",
  format,
}: {
  label: string;
  value: string | number;
  trend?: string;
  density?: "soft" | "structured";
  accent?: keyof typeof ACCENTS;
  /** Grid placement, e.g. "col-span-2 lg:col-span-1" for a long currency value on mobile. */
  className?: string;
  /** Formatter for a numeric `value` (e.g. formatRupiah). Numeric values count up once when seen. */
  format?: (n: number) => string;
}) {
  return (
    <Card className={`p-5 ${className}`}>
      <p
        className={`text-sm font-medium text-dc-text-2 ${
          density === "structured" ? `relative pt-3 before:absolute before:left-0 before:top-0 before:h-0.5 before:w-6 before:rounded-full ${ACCENTS[accent]}` : ""
        }`}
      >
        {label}
      </p>
      <p className="mt-1.5 font-heading text-[2rem] font-semibold leading-tight text-dc-ink [font-variant-numeric:lining-nums_tabular-nums] sm:text-[2.4rem]">
        {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
      </p>
      {trend && <p className="mt-0.5 text-xs text-dc-text-3">{trend}</p>}
    </Card>
  );
}
