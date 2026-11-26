"use client";

// The vendor's order list, seller-center style: underline status tabs with
// counts, a search box and an optional date range, then flat rows. Filtering
// is client-side (the list per vendor is small). Reduced motion: no movement.
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useState } from "react";

import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import type { Booking, BookingStatus } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

import { BookingRow, formatTanggal, sortForWork } from "./ops";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";
const FIELD = `min-h-11 w-full rounded-full border border-wd-line-2 bg-white px-4 text-[0.95rem] text-wd-ink placeholder:text-wd-muted hover:border-wd-ink ${FOCUS}`;

type TabKey = "all" | "requested" | "confirmed" | "upcoming" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string; statuses?: BookingStatus[]; empty: string; art: ArtKind }[] = [
  { key: "all", label: "Semua", empty: "Belum ada booking.", art: "clipboard" },
  { key: "requested", label: "Perlu dijawab", statuses: ["requested"], empty: "Tidak ada permintaan yang menunggu jawabanmu.", art: "envelope" },
  { key: "confirmed", label: "Menunggu DP", statuses: ["confirmed"], empty: "Tidak ada booking yang menunggu DP client.", art: "coin" },
  { key: "upcoming", label: "Akan datang", statuses: ["dp_paid", "full_paid"], empty: "Belum ada acara dengan DP masuk.", art: "clipboard" },
  { key: "completed", label: "Selesai", statuses: ["completed"], empty: "Belum ada acara yang selesai.", art: "people" },
  { key: "cancelled", label: "Dibatalkan", statuses: ["cancelled"], empty: "Tidak ada booking yang dibatalkan.", art: "frame" },
];

export function BookingList({ bookings }: { bookings: Booking[] }) {
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<TabKey | null>(null);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || from !== "" || to !== "";
  // Search and dates narrow the whole list first, so the tab counts match what a tab would show.
  const narrowed = sortForWork(
    bookings.filter((b) => {
      const day = b.event_date.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return `${b.package_description} ${formatTanggal(b.event_date, true)} ${day}`.toLowerCase().includes(q);
    }),
  );
  const inTab = (t: (typeof TABS)[number], list: Booking[]) => (t.statuses ? list.filter((b) => t.statuses!.includes(b.status)) : list);
  const needsAnswer = bookings.some((b) => b.status === "requested");
  const tabKey = picked ?? (needsAnswer ? "requested" : "all");
  const current = TABS.find((t) => t.key === tabKey)!;
  const list = inTab(current, narrowed);

  function clearFilters() {
    setQuery("");
    setFrom("");
    setTo("");
  }

  return (
    <div>
      <div role="tablist" aria-label="Booking menurut status" className="flex gap-1 overflow-x-auto border-b border-wd-line [scrollbar-width:none]">
        {TABS.map((t) => {
          const on = t.key === tabKey;
          const n = inTab(t, narrowed).length;
          return (
            <button
              key={t.key}
              id={`tab-bk-${t.key}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="panel-bk"
              onClick={() => setPicked(t.key)}
              className={`relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${FOCUS}`}
            >
              {t.label}
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.75rem] font-bold tabular-nums ${n > 0 ? (t.key === "requested" ? "bg-wd-accent text-wd-ink" : "bg-wd-blush text-wd-ink") : "bg-wd-paper text-wd-muted"}`}>{n}</span>
              {on && <motion.span layoutId={reduced ? undefined : "bookings-underline"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="bk-cari" className="sr-only">
            Cari booking
          </label>
          <input id="bk-cari" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari paket atau tanggal" className={FIELD} />
        </div>
        <button
          type="button"
          aria-expanded={datesOpen}
          aria-controls="bk-tanggal"
          onClick={() => setDatesOpen((v) => !v)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 text-[0.93rem] font-semibold text-wd-ink transition-colors hover:border-wd-ink ${from || to ? "border-wd-accent-deep bg-wd-accent-wash" : "border-wd-line-2 bg-white"} ${FOCUS}`}
        >
          Tanggal acara
          {(from || to) && <span className="sr-only"> (aktif)</span>}
        </button>
      </div>
      {datesOpen && (
        <div id="bk-tanggal" className="-mt-1 mb-4 grid grid-cols-1 gap-3 rounded-[22px] bg-wd-accent-wash p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-wd-ink">
            Dari
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-wd-ink">
            Sampai
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={FIELD} />
          </label>
        </div>
      )}

      <div id="panel-bk" role="tabpanel" aria-labelledby={`tab-bk-${tabKey}`} aria-live="polite">
        {list.length === 0 ? (
          <div className="flex flex-col items-start gap-4 border-t border-wd-line py-6 sm:flex-row sm:items-center">
            <span aria-hidden className="h-16 w-16 shrink-0 rounded-2xl bg-wd-accent-wash p-3">
              <ClientArt kind={filtering ? "mirror" : current.art} />
            </span>
            <div>
              <p className="text-[0.95rem] leading-relaxed text-wd-text">{filtering ? "Tidak ada booking yang cocok dengan pencarianmu." : current.empty}</p>
              {filtering && (
                <button type="button" onClick={clearFilters} className={`${wdButton({ variant: "outline", size: "sm", className: "mt-3" })} ${FOCUS}`}>
                  Hapus pencarian
                </button>
              )}
            </div>
          </div>
        ) : (
          <LayoutGroup>
            <ul className="border-t border-wd-line">
              <AnimatePresence initial={false} mode="popLayout">
                {list.map((b) => (
                  <motion.li
                    key={b.id}
                    layout={reduced ? false : "position"}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.28, ease: EASE } }}
                    exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 24, transition: { duration: 0.2 } }}
                  >
                    <BookingRow booking={b} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </LayoutGroup>
        )}
      </div>
    </div>
  );
}
