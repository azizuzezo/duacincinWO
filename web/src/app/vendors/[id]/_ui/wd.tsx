// Small "Putih" helpers for the vendor profile: a button with a loading
// state (wdButton from the home page has none), a pulse block for
// skeletons and the empty / failed panels used by each section.
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { wdButton } from "@/components/home/ui";

type Variant = "gold" | "ink" | "outline" | "soft" | "white";

export function WdButton({
  variant = "gold",
  size = "md",
  block = false,
  loading = false,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; block?: boolean; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={wdButton({ variant, size, className: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink ${size === "sm" ? "!min-h-11" : ""} ${block ? "w-full" : ""} ${className}` })}
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
      )}
      {children}
    </button>
  );
}

export function Pulse({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-wd-blush motion-reduce:animate-none ${className}`} />;
}

/** Quiet panel for a section with nothing to show yet. */
export function EmptyNote({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="rounded-[14px] bg-wd-blush px-5 py-8 text-center">
      <p className="font-semibold text-wd-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[0.95rem] leading-relaxed text-wd-muted">{body}</p>
    </div>
  );
}

/** A section that failed to load, with a retry. */
export function RetryNote({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[14px] border border-wd-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-wd-text">{what} belum bisa dimuat. Periksa koneksi lalu coba lagi.</p>
      <WdButton variant="ink" size="sm" onClick={onRetry}>
        Coba lagi
      </WdButton>
    </div>
  );
}
