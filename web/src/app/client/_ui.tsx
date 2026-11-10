// Small shared helpers for the client pages (private module, not a route).
// Class strings and helpers only; the real primitives live in components/ui.
// Every export keeps its old name and signature: other client pages import them.

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

/** 44px field on the warm card surface, same shape as ui/Field controls. */
export const INPUT = `min-h-11 w-full rounded-md border border-dc-line-strong bg-dc-white px-3.5 py-2 text-[0.95rem] text-dc-ink transition-colors placeholder:text-dc-text-3 hover:border-dc-ink/40 focus:border-dc-ink ${FOCUS}`;

export const LABEL = "text-sm font-semibold text-dc-ink";

/** Quiet text link in clay (gold is never text on light). */
export const LINK = `inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline ${FOCUS}`;

/** Small label above a value. Sentence case, no wide tracking. */
export const EYEBROW = "text-sm font-medium text-dc-text-3";

export const H2 = "font-heading text-[1.75rem] leading-tight text-dc-ink sm:text-[2rem]";

export const ERROR_TEXT = "text-sm text-dc-danger";

/** 44px square icon button (delete, attach, reply). */
export const ICON_BTN = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-dc-text-2 transition-colors hover:bg-dc-cream hover:text-dc-ink ${FOCUS}`;

export const GHOST_BTN = `inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold text-dc-ink transition-colors hover:bg-dc-cream ${FOCUS}`;

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`dc-skeleton rounded-md ${className}`} />;
}

/** Stack of card-shaped skeleton rows for list pages. */
export function SkeletonList({ rows = 3, height = "h-[72px]" }: { rows?: number; height?: string }) {
  return (
    <div role="status" aria-label="Memuat" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`${height} rounded-lg`} />
      ))}
    </div>
  );
}

/** Inline failure row with a retry, for a block inside a page. Full-page
 * failures use components/ui/ErrorState instead. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dc-danger/25 bg-dc-danger/[0.04] px-4 py-3">
      <p className="flex items-center gap-2 text-sm text-dc-danger">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex min-h-11 items-center rounded-full border border-dc-line-strong bg-dc-white px-5 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink ${FOCUS}`}
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dates. The API sends ISO dates ("2027-01-09" or a full timestamp); people
// read "9 Januari 2027". Date-only strings are read as local dates so a
// timezone never shifts the day.

function toDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "9 Januari 2027" (or "Sabtu, 9 Januari 2027" with `weekday`). */
export function formatTanggal(value: string | undefined, opts: { weekday?: boolean; short?: boolean } = {}): string {
  if (!value) return "";
  const d = toDate(value);
  if (!d) return value;
  return d.toLocaleDateString("id-ID", {
    weekday: opts.weekday ? "long" : undefined,
    day: "numeric",
    month: opts.short ? "short" : "long",
    year: "numeric",
  });
}

/** Whole days from today to the date (negative when it has passed). */
export function daysUntil(value: string | undefined): number | null {
  if (!value) return null;
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 864e5);
}

/** "96 hari lagi", "Besok", "Hari ini", "3 hari lalu". */
export function relativeDays(days: number): string {
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  if (days > 1) return `${days.toLocaleString("id-ID")} hari lagi`;
  return `${Math.abs(days).toLocaleString("id-ID")} hari lalu`;
}

/** First word of a full name, for a warm greeting. */
export function firstName(fullName: string | undefined, fallback: string): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || fallback;
}
