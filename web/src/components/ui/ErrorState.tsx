"use client";

import { Button } from "./Button";

/** Shown when loading failed. Plain words, no error codes, and a retry when
 * the caller can retry. Announced to screen readers. */
export function ErrorState({
  title = "Data belum bisa dimuat",
  body = "Periksa koneksi internetmu, lalu coba lagi.",
  onRetry,
  compact = false,
}: {
  title?: string;
  body?: React.ReactNode;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center rounded-xl border border-dc-danger/25 bg-dc-danger/[0.04] text-center ${compact ? "px-4 py-6" : "px-6 py-12"}`}
    >
      <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-dc-danger">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </svg>
      <p className={`mt-3 font-heading leading-tight text-dc-ink ${compact ? "text-xl" : "text-[1.75rem]"}`}>{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-dc-text-2">{body}</p>}
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-5">
          Coba lagi
        </Button>
      )}
    </div>
  );
}
