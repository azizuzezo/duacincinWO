"use client";

// Shared pieces for the admin vendor/client console pages (Putih style):
// header, route tabs, search, status pill, avatar, flat animated rows,
// empty/failed/skeleton states and a native <dialog> photo viewer.
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";

import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { EASE, useReducedMotion } from "@/lib/motion";

export const VA_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

export function VaHeader({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header>
      <p className="wd-kicker">{kicker}</p>
      <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-wd-text">{sub}</p>}
    </header>
  );
}

export function VaCount({ n, active }: { n: number | null | undefined; active?: boolean }) {
  if (typeof n !== "number") return null;
  return (
    <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.75rem] font-bold tabular-nums ${n > 0 && active ? "bg-wd-accent text-wd-ink" : n > 0 ? "bg-wd-blush text-wd-ink" : "bg-wd-paper text-wd-muted"}`}>{n}</span>
  );
}

/** Links between sibling routes, drawn as tabs (aria-current marks the page). */
export function VaRouteTabs({ label, items }: { label: string; items: { href: string; label: string; count?: number | null }[] }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="mt-7 flex gap-1 overflow-x-auto border-b border-wd-line [scrollbar-width:none]">
      {items.map((it) => {
        const on = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${VA_FOCUS}`}
          >
            {it.label}
            <VaCount n={it.count} active={on} />
            {on && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function VaSearch({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  const id = useId();
  return (
    <div className="relative w-full min-w-0 sm:max-w-sm sm:flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-wd-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        className={`min-h-11 w-full rounded-full border border-wd-line-2 bg-wd-white pl-10 pr-4 text-[0.95rem] text-wd-ink placeholder:text-wd-muted focus:border-wd-accent-line focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink`}
      />
    </div>
  );
}

export function VaChips({ label, options, value, onChange }: { label: string; options: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${on ? "border-wd-accent-line bg-wd-accent-soft text-wd-ink" : "border-wd-line-2 bg-wd-white text-wd-text hover:border-wd-ink hover:text-wd-ink"} ${VA_FOCUS}`}
          >
            {o.label}
            {typeof o.count === "number" && <span className="text-xs font-bold tabular-nums text-wd-text">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

const PILL = {
  ok: "bg-wd-ok/10 text-wd-ok",
  warn: "bg-wd-accent-soft text-wd-accent-ink",
  danger: "bg-wd-danger/10 text-wd-danger",
  neutral: "bg-wd-blush text-wd-text",
  gold: "bg-wd-accent text-wd-ink",
} as const;
export type VaTone = keyof typeof PILL;

export function VaPill({ tone = "neutral", children, className = "" }: { tone?: VaTone; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${PILL[tone]} ${className}`}>{children}</span>;
}

export function VaAvatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full bg-wd-accent-soft font-[family-name:var(--font-wd-display-face)] text-wd-accent-ink ${size === "lg" ? "h-14 w-14 text-xl" : "h-11 w-11 text-base"}`}>
      {initials}
    </span>
  );
}

/** A flat list row that slides out when it leaves the queue. Use inside <AnimatePresence initial={false}> */
export function VaRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.li
      layout={reduced ? false : "position"}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.28, ease: EASE } }}
      exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 24, transition: { duration: 0.2 } }}
      className={`border-b border-wd-line ${className}`}
    >
      {children}
    </motion.li>
  );
}

export function VaList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="border-t border-wd-line">
      <AnimatePresence initial={false}>
        {children}
      </AnimatePresence>
    </ul>
  );
}

export function VaEmpty({ art, title, children, action }: { art: ArtKind; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-8">
      <span aria-hidden className="h-16 w-16 shrink-0 rounded-2xl bg-wd-accent-wash p-3">
        <ClientArt kind={art} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-wd-ink">{title}</p>
        {children && <p className="mt-0.5 text-sm leading-relaxed text-wd-text">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function VaFailed({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wd-accent-wash px-5 py-4">
      <p className="text-wd-text">{what} belum bisa dimuat. Periksa koneksi lalu coba lagi.</p>
      <button type="button" onClick={onRetry} className={`${wdButton({ variant: "ink", size: "sm" })} ${VA_FOCUS}`}>
        Coba lagi
      </button>
    </div>
  );
}

export function VaAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wd-danger/[0.06] px-5 py-3">
      <p className="text-sm font-medium text-wd-danger">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${wdButton({ variant: "outline", size: "sm" })} ${VA_FOCUS}`}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function VaSkeleton({ rows = 4, label = "Memuat" }: { rows?: number; label?: string }) {
  return (
    <SkeletonGroup label={label} className="border-t border-wd-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-wd-line px-1 py-5">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-10 w-28 rounded-full sm:block" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

export const VA_BTN_OUTLINE = `${wdButton({ variant: "outline", size: "sm", className: "min-h-11" })} ${VA_FOCUS}`;
export const VA_BTN_GOLD = `${wdButton({ variant: "gold", size: "sm", className: "min-h-11" })} ${VA_FOCUS}`;
export const VA_BTN_DANGER =
  `inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-wd-danger/35 bg-wd-white px-4 text-sm font-semibold text-wd-danger transition-colors hover:border-wd-danger hover:bg-wd-danger/[0.06] disabled:pointer-events-none disabled:opacity-60 ${VA_FOCUS}`;

/** Native <dialog> photo viewer: Escape, backdrop click and the close button
 * all close it; arrows (buttons and keys) step through the photos. */
export function VaLightbox({ photos, index, onClose, onIndex, label }: { photos: string[]; index: number | null; onClose: () => void; onIndex: (i: number) => void; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const n = photos.length;
  const i = index ?? 0;
  const step = (by: number) => onIndex((i + by + n) % n);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
      className="m-auto max-h-[100svh] max-w-[100vw] bg-transparent p-0 backdrop:bg-wd-ink/80"
    >
      {open && (
        <div className="relative flex max-h-[100svh] max-w-[100vw] items-center justify-center p-4 sm:p-8" onClick={(e) => e.target === e.currentTarget && onClose()}>
          {/* eslint-disable-next-line @next/next/no-img-element -- vendor uploads, admin-only viewer */}
          <img src={photos[i]} alt={`Foto portofolio ${i + 1} dari ${n}`} className="max-h-[calc(100svh-6rem)] max-w-full rounded-xl object-contain" />
          <button type="button" onClick={onClose} aria-label="Tutup foto" className={`absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-wd-white text-wd-ink ${VA_FOCUS}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          {n > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Foto sebelumnya" className={`absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-wd-white text-wd-ink ${VA_FOCUS}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Foto berikutnya" className={`absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-wd-white text-wd-ink ${VA_FOCUS}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-wd-white px-3 py-1 text-xs font-semibold tabular-nums text-wd-ink">
                {i + 1} / {n}
              </p>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
