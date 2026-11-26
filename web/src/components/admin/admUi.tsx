"use client";

// Small Putih building blocks for the admin console pages (disputes,
// disbursements, chats). Flat hairline rows, soft gold wash panels, no cards
// inside cards. Reduced motion: no movement.
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import type { ReactNode } from "react";

import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { Modal } from "@/components/ui/Modal";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

export const ADM_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";
export const ADM_FIELD = `min-h-11 w-full rounded-full border border-wd-line-2 bg-white px-4 text-base text-wd-ink placeholder:text-wd-muted hover:border-wd-ink ${ADM_FOCUS}`;
export const ADM_DANGER_BTN = `inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-wd-danger px-6 text-[0.95rem] font-semibold text-white transition-colors hover:bg-[#8a2d23] disabled:pointer-events-none disabled:opacity-60 ${ADM_FOCUS}`;

export function AdmHead({ kicker, title, note }: { kicker: string; title: ReactNode; note?: ReactNode }) {
  return (
    <>
      <p className="wd-kicker">{kicker}</p>
      <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">{title}</h1>
      {note && <p className="mt-2 max-w-2xl text-wd-text">{note}</p>}
    </>
  );
}

export function AdmError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wd-danger/[0.06] px-4 py-3">
      <p className="text-sm font-medium text-wd-danger">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`inline-flex min-h-11 items-center px-2 text-sm font-semibold text-wd-ink underline underline-offset-4 ${ADM_FOCUS}`}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function AdmRowsSkeleton({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <SkeletonGroup label={label} className="border-t border-wd-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-wd-line px-1 py-5 sm:px-3">
          <span aria-hidden className="block h-11 w-11 shrink-0 animate-pulse rounded-full bg-wd-blush" />
          <span className="flex flex-1 flex-col gap-2">
            <span aria-hidden className="block h-4 w-2/5 animate-pulse rounded-full bg-wd-blush" />
            <span aria-hidden className="block h-3 w-3/5 animate-pulse rounded-full bg-wd-blush" />
          </span>
        </div>
      ))}
    </SkeletonGroup>
  );
}

export function AdmEmpty({ art, title, children }: { art: ArtKind; title?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 border-t border-wd-line py-6 sm:flex-row sm:items-center">
      <span aria-hidden className="h-16 w-16 shrink-0 rounded-2xl bg-wd-accent-wash p-3">
        <ClientArt kind={art} />
      </span>
      <div>
        {title && <p className="font-semibold text-wd-ink">{title}</p>}
        <p className="max-w-lg text-[0.95rem] leading-relaxed text-wd-text">{children}</p>
      </div>
    </div>
  );
}

export function AdmSearch({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className={ADM_FIELD} />
    </div>
  );
}

export function AdmTabs<K extends string>({
  idBase,
  label,
  tabs,
  value,
  onChange,
}: {
  idBase: string;
  label: string;
  tabs: { key: K; label: string; count?: number; hot?: boolean }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-wd-line [scrollbar-width:none]">
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            id={`tab-${idBase}-${t.key}`}
            role="tab"
            type="button"
            aria-selected={on}
            aria-controls={`panel-${idBase}`}
            onClick={() => onChange(t.key)}
            className={`relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${ADM_FOCUS}`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.75rem] font-bold tabular-nums ${t.count > 0 ? (t.hot ? "bg-wd-accent text-wd-ink" : "bg-wd-blush text-wd-ink") : "bg-wd-paper text-wd-muted"}`}
              >
                {t.count}
              </span>
            )}
            {on && <motion.span layoutId={reduced ? undefined : `${idBase}-underline`} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
          </button>
        );
      })}
    </div>
  );
}

/** Animated flat list: rows arrive with a short fade, leave sliding out. */
export function AdmList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <LayoutGroup>
      <ul aria-label={label} className="border-t border-wd-line">
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </ul>
    </LayoutGroup>
  );
}

export function AdmListItem({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.li
      layout={reduced ? false : "position"}
      className="border-b border-wd-line"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.28, ease: EASE } }}
      exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 24, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.li>
  );
}

export function AdmAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full bg-wd-accent-soft font-semibold text-wd-accent-ink ${size === "sm" ? "h-10 w-10 text-sm" : "h-11 w-11 text-[0.95rem]"}`}>
      {initials}
    </span>
  );
}

export function AdmPill({ tone = "neutral", children }: { tone?: "neutral" | "gold" | "danger" | "ok"; children: ReactNode }) {
  const cls =
    tone === "danger"
      ? "bg-wd-danger/10 text-wd-danger"
      : tone === "ok"
        ? "bg-wd-ok/10 text-wd-ok"
        : tone === "gold"
          ? "bg-wd-accent-soft text-wd-accent-ink"
          : "bg-wd-paper text-wd-text ring-1 ring-wd-line";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${cls}`}>{children}</span>;
}

/** The one Putih confirmation: says what will happen, then two clear buttons. */
export function AdmConfirm({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  danger = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequence: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${danger ? "bg-wd-danger/[0.06] text-wd-ink" : "bg-wd-accent-wash text-wd-text"}`}>{consequence}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={`${wdButton({ variant: "outline", size: "md" })} ${ADM_FOCUS}`}>
          Batal
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={danger ? ADM_DANGER_BTN : `${wdButton({ variant: "ink", size: "md" })} ${ADM_FOCUS}`}>
          {busy ? "Memproses..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
