// Small shared primitives for the client dashboard pages (private module, not a route).
// Kept local so the locked foundation components stay untouched.

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

/** 44px field, 6px radius, hairline border: matches TextField. */
export const INPUT = `min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-3 py-2 text-sm text-dc-ink transition-colors placeholder:text-dc-black/50 hover:border-dc-ink/40 focus:border-dc-ink ${FOCUS}`;

export const LABEL = "text-sm font-medium text-dc-ink";

/** Quiet text link in the single accent (gold is never text). */
export const LINK = `inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline ${FOCUS}`;

export const EYEBROW = "text-xs font-medium uppercase tracking-wide text-dc-black/60";

export const H2 = "font-heading text-2xl leading-tight text-dc-ink";

export const ERROR_TEXT = "text-sm text-red-700";

/** 44px square icon button (delete, attach, reply). */
export const ICON_BTN = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-dc-black/60 transition-colors hover:bg-dc-cream hover:text-dc-ink ${FOCUS}`;

export const GHOST_BTN = `inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold text-dc-ink transition-colors hover:bg-dc-cream ${FOCUS}`;

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-md bg-dc-ink/[0.07] motion-safe:animate-pulse ${className}`} />;
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

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-700/25 bg-dc-white px-4 py-3">
      <p className={ERROR_TEXT}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex min-h-11 items-center rounded-md border border-dc-ink/25 px-4 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink ${FOCUS}`}
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
