import { Card } from "@/components/ui/Card";

/** Page container shared by all internal pages (dashboard content max 1152px). */
export const PAGE = "mx-auto max-w-6xl px-4 py-8 sm:px-6";

/** Shared control styles: 6px radius, hairline border, visible focus. */
export const INPUT =
  "min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-3 text-sm text-dc-ink outline-none transition-colors placeholder:text-dc-black/45 focus:border-dc-ink focus-visible:ring-2 focus-visible:ring-dc-clay/40";
export const TEXTAREA =
  "mt-1.5 w-full rounded-md border border-dc-ink/20 bg-dc-white px-3 py-2 text-sm text-dc-ink outline-none transition-colors focus:border-dc-ink focus-visible:ring-2 focus-visible:ring-dc-clay/40";

/** Table cell styles. Header is quiet, rows are divided by hairlines. */
export const TH = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-dc-black/60";
export const TD = "px-4 py-3 align-middle text-sm text-dc-ink";
export const TR = "border-t border-dc-ink/10 transition-colors hover:bg-dc-ivory/70";
export const NUM = "text-right tabular-nums";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-clay/50";

/** Destructive action: red outline (secondary) or solid (final confirm). */
export function DangerButton({
  solid,
  loading,
  className = "",
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { solid?: boolean; loading?: boolean }) {
  const look = solid
    ? "bg-red-700 text-white hover:bg-red-800"
    : "border border-red-700/40 bg-transparent text-red-800 hover:border-red-700 hover:bg-red-50";
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${look} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

/** Underline tabs; the active tab uses ink + 2px rule. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="mb-5 flex gap-1 border-b border-dc-ink/10">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors ${FOCUS} ${
            value === t.value ? "border-dc-ink text-dc-ink" : "border-transparent text-dc-black/60 hover:text-dc-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-700/25 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`min-h-11 rounded-md border border-red-700/40 px-4 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 ${FOCUS}`}
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

/** Neutral skeleton rows for tables and lists. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden" >
      <div role="status" aria-label="Memuat">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-4 ${i > 0 ? "border-t border-dc-ink/10" : ""}`}>
            <div className="h-4 w-1/3 animate-pulse rounded bg-dc-cream" />
            <div className="ml-auto h-4 w-1/5 animate-pulse rounded bg-dc-cream" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Table wrapper: card with its own horizontal scroll so the page never overflows. */
export function TableCard({ children, minWidth = "min-w-[640px]" }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${minWidth}`}>{children}</table>
      </div>
    </Card>
  );
}
