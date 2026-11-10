import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { FundStatus } from "@/components/ui/FundStatus";
import {
  BOOKING_STATUS_TONE,
  formatRupiah,
  type Booking,
  type BookingStatus,
} from "@/lib/api";

// Shared bits for the vendor operations pages (Hari ini, Booking, Pencairan).
// A vendor reads these on a phone between jobs, so every row leads with the
// date and the money, in words, never as raw ISO strings.

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "2027-01-09" (or a full ISO string) as a local calendar date, so a date
 * never shifts a day because of the timezone. */
export function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "9 Januari 2027". Falls back to the raw value if it is not a date. */
export function formatTanggal(value: string, withDay = false): string {
  const d = parseDay(value);
  if (!d) return value;
  const s = `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${HARI[d.getDay()]}, ${s}` : s;
}

/** "Senin, 9 Januari 2027 pukul 14.00" for a meeting timestamp. */
export function formatWaktu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} pukul ${hh}.${mm}`;
}

export function todayLabel(): string {
  const d = new Date();
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Whole days from today to the event (negative = already passed). */
export function daysUntil(value: string): number | null {
  const d = parseDay(value);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 864e5);
}

export function countdownLabel(value: string): string | null {
  const n = daysUntil(value);
  if (n === null) return null;
  if (n === 0) return "Hari ini";
  if (n === 1) return "Besok";
  if (n > 1) return `${n} hari lagi`;
  return n === -1 ? "Kemarin" : `${-n} hari lalu`;
}

/** Short vendor-side status: what the booking needs, from the vendor's view. */
export const VENDOR_STATUS: Record<BookingStatus, string> = {
  requested: "Perlu jawabanmu",
  confirmed: "Menunggu DP client",
  dp_paid: "DP masuk escrow",
  full_paid: "Lunas di escrow",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

/** Money the client has paid that DuaCincin is holding for this booking
 * (before commission). Mirrors FundStatus: DP while dp_paid, full price once
 * full_paid. */
export function heldAmount(b: Booking): number {
  if (b.status === "dp_paid") return b.dp_amount;
  if (b.status === "full_paid") return b.agreed_price;
  return 0;
}

/** Order for a work list: requests first, then upcoming events soonest
 * first, then past and closed ones (most recent first). */
export function sortForWork(list: Booking[]): Booking[] {
  const rank = (b: Booking) => {
    if (b.status === "requested") return 0;
    if (b.status === "completed" || b.status === "cancelled") return 2;
    return 1;
  };
  return list.slice().sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return rank(a) === 2 ? b.event_date.localeCompare(a.event_date) : a.event_date.localeCompare(b.event_date);
  });
}

/** Calendar leaf: day number big, month and year small. The first thing a
 * vendor scans for in a list of jobs is the date. */
export function DateLeaf({ value, tone = "light" }: { value: string; tone?: "light" | "gold" }) {
  const d = parseDay(value);
  if (!d) return null;
  return (
    <span
      aria-hidden
      className={`flex w-14 shrink-0 self-start flex-col items-center rounded-lg border py-1.5 leading-none ${
        tone === "gold" ? "border-dc-gold/50 bg-dc-gold/10" : "border-dc-line bg-dc-ivory"
      }`}
    >
      <span className="text-[11px] font-semibold text-dc-clay">{BULAN_PENDEK[d.getMonth()]}</span>
      <span className="mt-1 font-heading text-[1.7rem] font-semibold text-dc-ink [font-variant-numeric:lining-nums]">{d.getDate()}</span>
      <span className="mt-0.5 text-[11px] text-dc-text-3 tabular-nums">{d.getFullYear()}</span>
    </span>
  );
}

/** One booking as a tappable row: date leaf, package, price, countdown,
 * vendor-side status and where the money is. Whole row is the link. */
export function BookingRow({ booking: b, showFund = true }: { booking: Booking; showFund?: boolean }) {
  const needsAnswer = b.status === "requested";
  const countdown = b.status === "completed" || b.status === "cancelled" ? null : countdownLabel(b.event_date);
  return (
    <Link
      href={`/vendor/bookings/${b.id}`}
      className={`group flex gap-4 rounded-xl border bg-dc-white p-4 shadow-soft transition-[border-color,box-shadow,transform] duration-200 hover:border-dc-line-strong hover:shadow-lift motion-safe:hover:-translate-y-0.5 active:translate-y-0 active:bg-dc-ivory active:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold sm:p-5 ${
        needsAnswer ? "border-dc-gold/60" : "border-dc-line"
      }`}
    >
      <DateLeaf value={b.event_date} tone={needsAnswer ? "gold" : "light"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={needsAnswer ? "gold" : BOOKING_STATUS_TONE[b.status]}>{VENDOR_STATUS[b.status]}</Badge>
          {countdown && <span className="text-xs font-medium text-dc-text-3">{countdown}</span>}
        </div>
        <p className="mt-1.5 break-words font-semibold leading-snug text-dc-ink">{b.package_description || "Booking"}</p>
        <p className="mt-0.5 text-sm text-dc-text-2">
          <span className="sr-only">Tanggal acara </span>
          {formatTanggal(b.event_date, true)}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <p className="text-lg font-bold tabular-nums text-dc-ink">{formatRupiah(b.agreed_price)}</p>
          {showFund && b.status !== "requested" && (
            <div className="min-w-0">
              <FundStatus status={b.status} compact />
            </div>
          )}
        </div>
      </div>
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-1 hidden shrink-0 text-dc-text-3 transition-transform group-hover:translate-x-0.5 sm:block">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

export function BookingRowSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-dc-line bg-dc-white p-4 sm:p-5">
      <div className="dc-skeleton h-[74px] w-14 rounded-lg" />
      <div className="flex-1 space-y-2.5">
        <div className="dc-skeleton h-5 w-32 rounded-full" />
        <div className="dc-skeleton h-4 w-3/4 rounded" />
        <div className="dc-skeleton h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}
