"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";

/** Server messages are short lowercase Indonesian ("rentang harga tidak
 * valid"); show them as a sentence, and fall back to plain words otherwise. */
export function friendlyError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError) || !err.message) return fallback;
  const m = err.message.trim();
  const s = m.charAt(0).toUpperCase() + m.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

/** Digits-only rupiah field: shows "25.000.000" while the caller keeps the raw
 * digit string. The "Rp" prefix lives in the label so the control stays a
 * plain text input that screen readers announce as-is. */
export function RupiahInput({
  label,
  value,
  onChange,
  hint,
  error,
  id,
  optional,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (digits: string) => void;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
  optional?: boolean;
  onBlur?: () => void;
}) {
  return (
    <Input
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      onBlur={onBlur}
      inputMode="numeric"
      autoComplete="off"
      value={value ? Number(value).toLocaleString("id-ID") : ""}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
      placeholder="0"
    />
  );
}

/** Character counter under a text field, turns red past the limit. */
export function CharCount({ value, max }: { value: string; max: number }) {
  const n = [...value].length;
  return (
    <span className={`tabular-nums ${n > max ? "font-semibold text-dc-danger" : "text-dc-text-3"}`}>
      {n}/{max}
    </span>
  );
}

/** Mobile-only action bar pinned just above Shell's bottom tab bar (57px +
 * safe area). Fixed, not sticky: Shell's overflow wrappers break sticky. The
 * spacer keeps the last field from hiding under it. Hidden from md up, where
 * actions stay inline. */
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-24 md:hidden" />
      <div className="fixed inset-x-0 bottom-[calc(3.5625rem+env(safe-area-inset-bottom))] z-30 border-t border-dc-line bg-dc-ivory px-4 py-3 shadow-[0_-8px_24px_-18px_rgba(21,17,13,0.3)] sm:px-6 md:hidden">
        {children}
      </div>
    </>
  );
}

/** Closing line of each storefront chapter: answers "what do I do next?"
 * with one link to the next chapter (or the public page when it exists). */
export function NextStep({ href, label, note, external = false }: { href: string; label: string; note: string; external?: boolean }) {
  return (
    <div className="mt-14 flex flex-col gap-3 border-t border-dc-line pt-8 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-dc-text-3">Langkah berikutnya</p>
        <p className="mt-0.5 text-[0.95rem] leading-relaxed text-dc-text-2">{note}</p>
      </div>
      <Link
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="group inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-full border border-dc-line-strong px-5 font-semibold text-dc-ink transition-colors hover:border-dc-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold sm:self-auto"
      >
        {label}
        {external && <span className="sr-only">(buka di tab baru)</span>}
        {/* Arrow points forward through the chapters; it moves on hover to confirm direction. */}
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dc-clay transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${className}`}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5" />
    </svg>
  );
}

export function PencilIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function PhotoIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="10" r="1.8" />
      <path d="M21 15.5l-5-5-9 9" />
    </svg>
  );
}
