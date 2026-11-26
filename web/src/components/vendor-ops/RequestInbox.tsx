"use client";

// The vendor's order inbox, like a seller center: three tabs (needs an
// answer, waiting for the down payment, coming up), each with its count, and
// a list that reshuffles when something changes. A request can be accepted or
// declined right in the row; the row then leaves this tab and the counts
// follow. Reduced motion: no movement, the list just updates.
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { Badge } from "@/components/ui/Badge";
import { FundStatus } from "@/components/ui/FundStatus";
import { apiPost, ApiError, BOOKING_STATUS_TONE, formatRupiah, type Booking, type BookingStatus } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

import { countdownLabel, DateLeaf, formatTanggal, VENDOR_STATUS } from "./ops";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

type TabKey = "requested" | "confirmed" | "upcoming";

const TABS: { key: TabKey; label: string; statuses: BookingStatus[]; empty: string; art: ArtKind }[] = [
  { key: "requested", label: "Perlu dijawab", statuses: ["requested"], empty: "Belum ada permintaan baru. Permintaan booking dari client muncul di sini lebih dulu.", art: "envelope" },
  { key: "confirmed", label: "Menunggu DP", statuses: ["confirmed"], empty: "Tidak ada booking yang menunggu DP.", art: "coin" },
  { key: "upcoming", label: "Akan datang", statuses: ["dp_paid", "full_paid"], empty: "Belum ada acara dengan DP masuk. Acara yang sudah dibayar muncul di sini, urut dari yang terdekat.", art: "clipboard" },
];

export function RequestInbox({ bookings, onStatus }: { bookings: Booking[]; onStatus: (id: string, status: BookingStatus) => void }) {
  const reduced = useReducedMotion();
  const counts = Object.fromEntries(TABS.map((t) => [t.key, bookings.filter((b) => t.statuses.includes(b.status)).length])) as Record<TabKey, number>;
  // Open on the first tab that has something, so the vendor lands on work, not on an empty list.
  const [picked, setPicked] = useState<TabKey | null>(null);
  const tab = picked ?? (counts.requested ? "requested" : counts.upcoming ? "upcoming" : counts.confirmed ? "confirmed" : "requested");
  const current = TABS.find((t) => t.key === tab)!;
  const list = bookings.filter((b) => current.statuses.includes(b.status)).sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <div>
      <div role="tablist" aria-label="Booking menurut tahap" className="flex gap-1 overflow-x-auto border-b border-wd-line [scrollbar-width:none]">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="panel-inbox"
              onClick={() => setPicked(t.key)}
              className={`relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${FOCUS}`}
            >
              {t.label}
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.75rem] font-bold tabular-nums ${counts[t.key] > 0 ? (t.key === "requested" ? "bg-wd-accent text-wd-ink" : "bg-wd-blush text-wd-ink") : "bg-wd-paper text-wd-muted"}`}>{counts[t.key]}</span>
              {on && <motion.span layoutId={reduced ? undefined : "inbox-underline"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
            </button>
          );
        })}
      </div>

      <div id="panel-inbox" role="tabpanel" aria-labelledby={`tab-${tab}`} aria-live="polite">
        {list.length === 0 ? (
          <div className="flex items-center gap-4 py-6">
            <span aria-hidden className="h-14 w-14 shrink-0 rounded-2xl bg-wd-accent-wash p-2.5">
              <ClientArt kind={current.art} />
            </span>
            <p className="text-sm leading-relaxed text-wd-text">{current.empty}</p>
          </div>
        ) : (
          <LayoutGroup>
            <ul>
              <AnimatePresence initial={false} mode="popLayout">
                {list.map((b) => (
                  <motion.li
                    key={b.id}
                    layout={reduced ? false : "position"}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.28, ease: EASE } }}
                    exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 24, transition: { duration: 0.2 } }}
                    className="border-b border-wd-line"
                  >
                    <InboxRow booking={b} onStatus={onStatus} />
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

function InboxRow({ booking: b, onStatus }: { booking: Booking; onStatus: (id: string, status: BookingStatus) => void }) {
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsAnswer = b.status === "requested";
  const countdown = countdownLabel(b.event_date);

  async function act(kind: "confirm" | "cancel") {
    setBusy(kind);
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${b.id}/${kind}`, {});
      onStatus(b.id, kind === "confirm" ? "confirmed" : "cancelled");
    } catch (err) {
      setAsking(false);
      setError(err instanceof ApiError ? err.message : "Belum berhasil. Coba lagi sebentar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-1 py-4 sm:px-2">
      <Link href={`/vendor/bookings/${b.id}`} className={`group flex gap-4 rounded-2xl p-2 transition-colors hover:bg-wd-paper ${FOCUS}`}>
        <DateLeaf value={b.event_date} tone={needsAnswer ? "gold" : "light"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={needsAnswer ? "warning" : b.status === "confirmed" ? "info" : BOOKING_STATUS_TONE[b.status]}>{VENDOR_STATUS[b.status]}</Badge>
            {countdown && <span className="text-xs font-medium text-wd-muted">{countdown}</span>}
          </div>
          <p className="mt-1.5 break-words font-semibold leading-snug text-wd-ink">{b.package_description || "Booking"}</p>
          <p className="mt-0.5 text-sm text-wd-text">
            <span className="sr-only">Tanggal acara </span>
            {formatTanggal(b.event_date, true)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <p className="text-lg font-bold tabular-nums text-wd-ink">{formatRupiah(b.vendor_amount ?? b.agreed_price)}</p>
            {!needsAnswer && (
              <div className="min-w-0">
                <FundStatus status={b.status} compact />
              </div>
            )}
          </div>
        </div>
      </Link>

      {needsAnswer && (
        <div className="mt-2 pl-[4.5rem] sm:pl-[4.75rem]">
          {asking ? (
            <div role="alertdialog" aria-label="Tolak permintaan" className="flex flex-wrap items-center gap-2 text-sm text-wd-text">
              <span>Tolak permintaan ini?</span>
              <button type="button" onClick={() => setAsking(false)} disabled={busy !== null} className={`min-h-10 rounded-full px-4 font-semibold text-wd-ink hover:bg-wd-blush ${FOCUS}`}>
                Batal
              </button>
              <button type="button" onClick={() => act("cancel")} disabled={busy !== null} aria-busy={busy === "cancel"} className={`min-h-10 rounded-full bg-wd-ink px-5 font-semibold text-white disabled:opacity-60 ${FOCUS}`}>
                {busy === "cancel" ? "Menolak..." : "Ya, tolak"}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => act("confirm")} disabled={busy !== null} aria-busy={busy === "confirm"} className={`inline-flex min-h-11 items-center rounded-full bg-wd-accent px-6 text-[0.92rem] font-semibold text-wd-ink transition-colors hover:bg-wd-accent-deep disabled:opacity-60 ${FOCUS}`}>
                {busy === "confirm" ? "Menerima..." : "Terima"}
              </button>
              <button type="button" onClick={() => setAsking(true)} disabled={busy !== null} className={`inline-flex min-h-11 items-center rounded-full border border-wd-line-2 bg-white px-6 text-[0.92rem] font-semibold text-wd-ink transition-colors hover:border-wd-ink disabled:opacity-60 ${FOCUS}`}>
                Tolak
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-wd-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
