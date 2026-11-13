"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { controlClasses } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { EASE, useReducedMotion } from "@/lib/motion";

/**
 * Building blocks for the internal tools (admin + consultant). Internal pages
 * are work surfaces: calm ivory, one ink banner on the dashboard only, dense
 * rows that still breathe, and every irreversible action behind a dialog that
 * says what will happen in plain words.
 */

/** Page container shared by all internal pages (content max 1152px). */
export const PAGE = "mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10";

/* ------------------------------------------------------------------ dates */

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function valid(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "9 Januari 2027" */
export function tanggal(iso: string | undefined | null): string {
  const d = valid(iso);
  return d ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : "";
}

/** "Sabtu, 9 Januari 2027" */
export function tanggalHari(d: Date): string {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14.30" (Indonesian clock style) */
export function jam(iso: string | Date): string {
  const d = typeof iso === "string" ? valid(iso) : iso;
  if (!d) return "";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "9 Januari 2027, 14.30" */
export function tanggalJam(iso: string | undefined | null): string {
  const d = valid(iso);
  return d ? `${tanggal(iso)}, ${jam(d)}` : "";
}

/** Indonesian zone name for the viewer's clock (WIB/WITA/WIT), else "". */
export function zonaWaktu(d: Date = new Date()): string {
  const off = d.getTimezoneOffset();
  return off === -420 ? "WIB" : off === -480 ? "WITA" : off === -540 ? "WIT" : "";
}

/** "baru saja", "5 menit lalu", "3 jam lalu", "kemarin", else the full date. */
export function relatif(iso: string | undefined | null): string {
  const d = valid(iso);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hari lalu`;
  return tanggal(iso);
}

/** Day bucket for timelines: "Hari ini", "Kemarin", or the full date. */
export function labelHari(iso: string): string {
  const d = valid(iso);
  if (!d) return "";
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return tanggalHari(d);
}

/* --------------------------------------------------------------- audit log */

/** Readable sentence for each recorded admin action (shared by the
 * dashboard's recent activity and the audit log). */
export const ACTION_LABEL: Record<string, string> = {
  "vendor.approve": "Menyetujui vendor",
  "vendor.reject": "Menolak vendor",
  "vendor.set_commission": "Mengubah komisi vendor",
  "disbursement.mark_disbursed": "Menandai dana sudah dicairkan",
  "dispute.resolve": "Memutuskan sengketa",
  "vendor_name_change.resolve": "Memproses ganti nama vendor",
  "staff.create": "Menambah anggota tim",
};

export const SANCTION_LABEL: Record<string, string> = {
  none: "Tidak ada pelanggaran",
  warning: "Peringatan",
  suspend: "Tangguhkan 30 hari",
  terminate: "Putus mitra permanen",
};

/** Extra detail from an audit entry's metadata, as short readable phrases. */
export function auditDetail(action: string, meta?: Record<string, unknown>): string[] {
  if (!meta) return [];
  const out: string[] = [];
  const str = (k: string) => (typeof meta[k] === "string" && (meta[k] as string).trim() ? (meta[k] as string).trim() : null);
  if (action === "vendor.approve" && meta.bulk === true) out.push("Disetujui bersama vendor lain");
  if (action === "vendor.reject" && str("reason"))out.push(`Alasan: ${str("reason")}`);
  if (action === "dispute.resolve" && str("sanction")) out.push(`Keputusan: ${SANCTION_LABEL[str("sanction")!] ?? str("sanction")}`);
  if (action === "vendor_name_change.resolve" && str("status")) out.push(str("status") === "approved" ? "Hasil: disetujui" : "Hasil: ditolak");
  if (action === "vendor.set_commission") {
    const rate = meta.rate;
    if (typeof rate === "number") out.push(`Komisi baru: ${persen(rate)}`);
    else if (rate === null) out.push("Kembali ke komisi bawaan");
  }
  return out;
}

/** 0.1 -> "10%", 0.125 -> "12,5%" */
export function persen(rate: number): string {
  return `${(Math.round(rate * 1000) / 10).toLocaleString("id-ID")}%`;
}

/* ------------------------------------------------------------------- bits */

/** Initials monogram in a thin gold ring (no generated avatars). */
export function Monogram({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const box = size === "sm" ? "h-10 w-10 text-sm" : size === "lg" ? "h-14 w-14 text-xl" : "h-12 w-12 text-base";
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dc-gold/60 bg-dc-cream font-heading font-semibold text-dc-clay ${box}`}>
      {initials}
    </span>
  );
}

/** Inline failure notice above existing content (the list stays visible). */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dc-danger/25 bg-dc-danger/[0.05] px-4 py-3">
      <p className="text-sm font-medium text-dc-danger">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

/** Row-shaped loading placeholder that matches the list layouts below. */
export function RowsSkeleton({ rows = 4, label = "Memuat" }: { rows?: number; label?: string }) {
  return (
    <SkeletonGroup label={label} className="overflow-hidden rounded-xl border border-dc-line bg-dc-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-center gap-4 px-5 py-5 ${i > 0 ? "border-t border-dc-line" : ""}`}>
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

/**
 * Search box with the "/" shortcut (focus from anywhere on the page, Escape
 * clears). Visible label is optional; the field always has one for readers.
 */
export function SearchField({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="relative w-full min-w-0 sm:w-auto sm:max-w-sm sm:flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dc-text-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        ref={ref}
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
        aria-keyshortcuts="/"
        className={`${controlClasses} pl-10 pr-12`}
      />
      <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-dc-line-strong bg-dc-cream px-2 py-0.5 font-sans text-xs text-dc-text-3 sm:block">
        /
      </kbd>
    </div>
  );
}

/** Two-link switch between sibling pages (e.g. pending vs active vendors).
 * These are real routes, so they are links with aria-current, not tabs. */
export function SubNav({ items, label }: { items: { href: string; label: string; count?: number | null }[]; label: string }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="mb-6 inline-flex rounded-full border border-dc-line bg-dc-cream p-1">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
              active ? "bg-dc-ink text-dc-on-dark" : "text-dc-text-2 hover:text-dc-ink"
            }`}
          >
            {it.label}
            {typeof it.count === "number" && (
              <span className={`rounded-full px-2 text-xs tabular-nums ${active ? "bg-dc-on-dark/15 text-dc-on-dark" : "bg-dc-white text-dc-text-2"}`}>{it.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Small "what is on screen" line under a toolbar ("3 dari 7 vendor"). */
export function ResultCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="text-sm text-dc-text-3" aria-live="polite">
      {shown === total ? `${total} ${noun}` : `${shown} dari ${total} ${noun}`}
    </p>
  );
}

/* ------------------------------------------------------------ confirmation */

/**
 * The one confirmation dialog for consequential actions. It names the
 * consequence in plain words, can collect a reason (with quick picks), and for
 * permanent actions asks the admin to type a phrase before the button unlocks.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  tone = "danger",
  busy = false,
  reason,
  typeToConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequence: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  /** Optional reason field: value + setter + label + quick-pick phrases. */
  reason?: { value: string; onChange: (v: string) => void; label: string; hint?: string; picks?: string[]; required?: boolean };
  /** Phrase the admin must type exactly to unlock the button (permanent actions). */
  typeToConfirm?: string;
  children?: React.ReactNode;
}) {
  const [typed, setTyped] = useState("");
  const reasonId = useId();
  const typeId = useId();
  const typedOk = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.trim().toLowerCase();
  const reasonOk = !reason?.required || reason.value.trim().length > 0;

  function close() {
    setTyped("");
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={title} size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (typedOk && reasonOk && !busy) onConfirm();
        }}
        className="flex flex-col gap-5"
      >
        <div className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${tone === "danger" ? "bg-dc-danger/[0.06] text-dc-black" : "bg-dc-cream text-dc-text-2"}`}>{consequence}</div>
        {children}
        {reason && (
          <div className="flex flex-col gap-2">
            <label htmlFor={reasonId} className="text-sm font-semibold text-dc-ink">
              {reason.label}
              {!reason.required && <span className="ml-1 font-normal text-dc-text-3">(opsional)</span>}
            </label>
            {reason.picks && reason.picks.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan cepat">
                {reason.picks.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => reason.onChange(p)}
                    aria-pressed={reason.value === p}
                    className={`min-h-11 rounded-full border px-3.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                      reason.value === p ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong text-dc-text-2 hover:border-dc-ink hover:text-dc-ink"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <textarea
              id={reasonId}
              rows={3}
              value={reason.value}
              onChange={(e) => reason.onChange(e.target.value)}
              aria-describedby={reason.hint ? `${reasonId}-hint` : undefined}
              className={`${controlClasses} py-3 leading-relaxed`}
            />
            {reason.hint && (
              <p id={`${reasonId}-hint`} className="text-xs leading-relaxed text-dc-text-3">
                {reason.hint}
              </p>
            )}
          </div>
        )}
        {typeToConfirm && (
          <div className="flex flex-col gap-2">
            <label htmlFor={typeId} className="text-sm font-semibold text-dc-ink">
              Ketik <span className="font-heading text-base italic text-dc-danger">{typeToConfirm}</span> untuk melanjutkan
            </label>
            <input id={typeId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={controlClasses} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={close}>
            Batal
          </Button>
          <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} size="sm" loading={busy} disabled={!typedOk || !reasonOk}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Outline button for a destructive first step ("Tolak"); the solid red
 * confirmation lives in ConfirmDialog. */
export function DangerGhostButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-dc-danger/35 px-4 text-sm font-semibold text-dc-danger transition-colors hover:border-dc-danger hover:bg-dc-danger/[0.06] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold disabled:pointer-events-none disabled:opacity-50 ${className}`}
    />
  );
}

/** Tracks a min-width media query (false during SSR and first paint). */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setMatch(m.matches);
    queueMicrotask(update);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return match;
}

/**
 * List item for work queues. Motion explains state: items arrive with a short
 * stagger (the list has loaded), and a resolved item slides out while its
 * neighbours close the gap (it left the queue). Wrap the list's children in
 * <AnimatePresence initial={false}> to get the exit. Reduced motion: instant.
 */
export function QueueItem({ index = 0, className = "", children }: { index?: number; className?: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <li className={className}>{children}</li>;
  return (
    <motion.li
      layout="position"
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: Math.min(index, 6) * 0.05 } }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.22, ease: EASE } }}
    >
      {children}
    </motion.li>
  );
}
