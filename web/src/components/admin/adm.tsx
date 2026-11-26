"use client";

// Small building blocks shared by the admin console pages (Putih style).
import { useEffect, useRef } from "react";

import { wdButton } from "@/components/home/ui";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";

export const ADM_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

export function AdmHeader({ kicker, title, sub, action }: { kicker: string; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        <p className="wd-kicker">{kicker}</p>
        <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">{title}</h1>
        {sub && <p className="mt-3 text-[0.95rem] leading-relaxed text-wd-text">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

export function Pill({ tone = "gold", children }: { tone?: "gold" | "ink" | "plain"; children: React.ReactNode }) {
  const cls = tone === "ink" ? "bg-wd-ink text-white" : tone === "gold" ? "bg-wd-accent-soft text-wd-accent-ink" : "bg-wd-blush text-wd-text";
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span aria-hidden className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wd-accent-soft font-semibold text-wd-accent-ink">
      {initials}
    </span>
  );
}

export function Chips({ label, items, value, onChange }: { label: string; items: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div role="group" aria-label={label} className="flex w-max gap-2">
        {items.map((it) => {
          const on = value === it.id;
          return (
            <button
              key={it.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(it.id)}
              className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${ADM_FOCUS} ${
                on ? "border-wd-ink bg-wd-ink text-white" : "border-wd-line-2 bg-white text-wd-text hover:border-wd-ink hover:text-wd-ink"
              }`}
            >
              {it.label}
              {typeof it.count === "number" && <span className={`tabular-nums ${on ? "text-white/75" : "text-wd-muted"}`}>{it.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  return (
    <label className="relative block w-full min-w-0 sm:max-w-sm sm:flex-1">
      <span className="sr-only">{label}</span>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-wd-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-full border border-wd-line-2 bg-white pl-10 pr-4 text-[0.95rem] text-wd-ink placeholder:text-wd-muted focus-visible:border-wd-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink"
      />
    </label>
  );
}

export function ListSkeleton({ rows = 4, label = "Memuat" }: { rows?: number; label?: string }) {
  return (
    <SkeletonGroup label={label} className="divide-y divide-wd-line border-y border-wd-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Floating "unsaved changes" bar, same placement as the vendor profile. */
export function SaveBar({
  title = "Perubahan belum disimpan",
  note,
  error,
  busy,
  saveLabel = "Simpan",
  formId,
  onCancel,
}: {
  title?: string;
  note: string;
  error?: string | null;
  busy: boolean;
  saveLabel?: string;
  formId: string;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
      <div role="region" aria-label="Simpan perubahan" className="mx-auto flex max-w-3xl animate-fade-up flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white px-5 py-3 shadow-wd-pop ring-1 ring-wd-line">
        <div className="min-w-0">
          <p className="font-semibold text-wd-ink">{title}</p>
          {error ? (
            <p role="alert" className="text-sm text-wd-danger">
              {error}
            </p>
          ) : (
            <p className="text-sm text-wd-text">{note}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={`${wdButton({ variant: "outline", size: "sm" })} ${ADM_FOCUS}`}>
            Batalkan
          </button>
          <button type="submit" form={formId} disabled={busy} aria-busy={busy} className={`${wdButton({ variant: "ink", size: "sm" })} ${ADM_FOCUS}`}>
            {busy ? "Menyimpan..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Native <dialog> (focus trap, Escape, top layer for free). Mount it only
 * while open. A click on the backdrop closes it. */
export function AdmDialog({
  title,
  note,
  onClose,
  size = "md",
  children,
  footer,
}: {
  title: string;
  note?: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className={`m-auto max-h-[calc(100svh-1.5rem)] w-[calc(100vw-1.5rem)] ${size === "lg" ? "max-w-3xl" : "max-w-lg"} overflow-hidden rounded-[24px] bg-white p-0 text-wd-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] backdrop:bg-wd-ink/60`}
    >
      <div className="flex max-h-[calc(100svh-1.5rem)] flex-col">
        <div className="relative px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <h2 className="wd-display pr-12 text-[1.7rem] leading-tight">{title}</h2>
          {note && <p className="mt-1 text-sm leading-relaxed text-wd-text">{note}</p>}
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Tutup"
            className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-wd-text hover:bg-wd-blush ${ADM_FOCUS}`}
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-wd-line bg-white px-5 py-3 sm:px-6">{footer}</div>}
      </div>
    </dialog>
  );
}
