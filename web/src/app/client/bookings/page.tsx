"use client";

// Booking list as a marketplace "pesanan" page: a heading, three plain figures
// (money held, active bookings, money passed on), underline status tabs with
// counts, then one row per booking: the vendor's photo, who/when, the price,
// where the money is, a progress line, and one button for the client's next
// move. Rows are separated by hairlines, not boxed. Everything comes from the
// client's bookings and the public vendor profiles.
import Link from "next/link";
import { useEffect, useState } from "react";

import { CLIENT_NEXT_ACTION } from "@/components/booking/BookingCard";
import { countdownLabel, formatTanggal } from "@/components/booking/format";
import { useVendorLookup, type VendorBrief } from "@/components/booking/useVendorLookup";
import { BOOKING_FILTERS, countBookingFilters, matchesBookingFilter } from "@/components/BookingStatusFilter";
import { bookingProgress } from "@/components/BookingStepper";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ClientShell } from "@/components/shell/ClientShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { FundStatus } from "@/components/ui/FundStatus";
import { CountUp } from "@/components/ui/Motion";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, BOOKING_STATUS_LABEL, formatRupiah, type Booking, type BookingStatus, type CurrentUser } from "@/lib/api";

export default function ClientBookingsPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientBookingsContent user={user} />}
    </WithUser>
  );
}

// Active bookings first (soonest event on top), then finished, then cancelled.
const ORDER: Record<BookingStatus, number> = { confirmed: 0, dp_paid: 0, full_paid: 0, requested: 0, completed: 1, cancelled: 2 };

const CTA: Partial<Record<BookingStatus, string>> = { confirmed: "Bayar DP", dp_paid: "Lunasi", full_paid: "Buka booking" };

const PILL: Record<BookingStatus, string> = {
  requested: "bg-wd-paper text-wd-text ring-1 ring-wd-line",
  confirmed: "bg-wd-accent text-wd-ink",
  dp_paid: "bg-wd-ink text-white",
  full_paid: "bg-wd-ink text-white",
  completed: "bg-wd-accent-soft text-wd-accent-ink",
  cancelled: "bg-wd-paper text-wd-muted ring-1 ring-wd-line",
};

/** Money the couple has paid that DuaCincin is holding, from real booking data. */
function heldAmount(b: Booking): number {
  if (b.status === "dp_paid") return b.dp_amount;
  if (b.status === "full_paid") return b.agreed_price;
  return 0;
}

function Thumb({ vendor }: { vendor?: VendorBrief }) {
  return (
    <span className="relative block h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[18px] bg-wd-accent-wash sm:h-32 sm:w-32">
      {vendor?.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- portfolio photo from the vendor profile
        <img src={vendor.photo} alt={vendor.photoAlt || `Portofolio ${vendor.name}`} className="h-full w-full object-cover object-[50%_22%] transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
      ) : (
        <span className="flex h-full w-full items-center justify-center p-5">
          <ClientArt kind="shop" />
        </span>
      )}
    </span>
  );
}

function Row({ b, vendor }: { b: Booking; vendor?: VendorBrief }) {
  const progress = bookingProgress(b.status);
  const finished = b.status === "cancelled" || b.status === "completed";
  const countdown = finished ? null : countdownLabel(b.event_date);
  const next = CLIENT_NEXT_ACTION[b.status];
  const title = vendor?.name ?? b.package_description ?? "Booking";
  return (
    <li className="border-b border-wd-line py-5 first:pt-0 sm:py-6">
      <Link href={`/client/bookings/${b.id}`} className="group block rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wd-accent">
        <div className="flex items-center justify-between gap-3 pb-3 text-[0.82rem] text-wd-muted">
          <span className="min-w-0 truncate">
            {vendor?.category}
            {vendor?.city ? ` · ${vendor.city}` : ""}
          </span>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[0.74rem] font-bold ${PILL[b.status]}`}>{BOOKING_STATUS_LABEL[b.status]}</span>
        </div>
        <div className="flex gap-4 sm:gap-6">
          <Thumb vendor={vendor} />
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-stretch sm:gap-6">
            <div className="min-w-0">
              <h2 className="wd-title wrap-break-word text-[1.15rem] leading-snug transition-colors group-hover:text-wd-accent-ink sm:text-[1.35rem]">{title}</h2>
              {vendor && b.package_description && <p className="mt-0.5 wrap-break-word text-[0.9rem] text-wd-text">{b.package_description}</p>}
              <p className="mt-1.5 text-[0.9rem] text-wd-text">
                <span className="font-semibold text-wd-ink">{formatTanggal(b.event_date)}</span>
                {countdown && <span className="text-wd-muted"> · {countdown}</span>}
              </p>
              <div className="mt-3 hidden sm:block">
                <FundStatus status={b.status} compact />
              </div>
              {!finished && (
                <div className="mt-3 flex items-center gap-3">
                  <span aria-hidden className="flex gap-1">
                    {Array.from({ length: progress.total }, (_, i) => (
                      <span key={i} className={`h-1.5 w-5 rounded-full ${i < progress.step - 1 ? "bg-wd-accent-deep" : i === progress.step - 1 ? "bg-wd-ink" : "bg-wd-line"}`} />
                    ))}
                  </span>
                  <span className="text-[0.78rem] text-wd-muted">
                    Langkah {progress.step} dari {progress.total}
                    <span className="hidden lg:inline">: {progress.title}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-row items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-between">
              <p className="text-[1.15rem] font-bold tabular-nums text-wd-ink sm:text-[1.3rem]">{formatRupiah(b.agreed_price)}</p>
              <span className={wdButton({ size: "sm", variant: next ? "gold" : "outline", className: "pointer-events-none" })}>{CTA[b.status] ?? "Lihat detail"}</span>
            </div>
          </div>
        </div>
        {next && <p className="mt-3 text-[0.86rem] font-semibold text-wd-accent-ink sm:hidden">{next}</p>}
      </Link>
    </li>
  );
}

function ClientBookingsContent({ user }: { user: CurrentUser }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  function load() {
    setLoading(true);
    setError(null);
    apiGet<Booking[]>("/api/v1/bookings")
      .then((data) => {
        setBookings(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat booking.");
        setLoading(false);
      });
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const vendors = useVendorLookup(bookings.map((b) => b.vendor_id));
  const sorted = [...bookings].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.event_date.localeCompare(b.event_date));
  const visible = sorted.filter((b) => matchesBookingFilter(b.status, filter));
  const counts = countBookingFilters(bookings.map((b) => b.status));
  const held = bookings.reduce((sum, b) => sum + heldAmount(b), 0);
  const released = bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.agreed_price, 0);
  const needsAction = bookings.filter((b) => CLIENT_NEXT_ACTION[b.status]).length;

  return (
    <ClientShell user={user}>
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="wd-kicker">Booking</p>
            <h1 className="wd-display mt-2 text-[clamp(2rem,4vw,3rem)] leading-[1.05]">
              Booking <em>vendormu</em>
            </h1>
            <p className="mt-2 text-wd-text">Tahap tiap vendor dan di mana uangmu berada sekarang.</p>
          </div>
          {bookings.length > 0 && (
            <Link href="/vendors" className={wdButton({ variant: "outline", size: "sm" })}>
              Cari vendor lain
            </Link>
          )}
        </div>

        {loading && (
          <div role="status" aria-label="Memuat booking" className="mt-8 flex flex-col gap-6">
            {[0, 1].map((i) => (
              <div key={i} aria-hidden className="flex gap-5">
                <span className="block h-32 w-32 shrink-0 animate-pulse rounded-[18px] bg-wd-blush" />
                <span className="flex flex-1 flex-col gap-3 pt-2">
                  <span className="block h-3 w-24 animate-pulse rounded-full bg-wd-blush" />
                  <span className="block h-6 w-2/3 animate-pulse rounded-full bg-wd-blush" />
                  <span className="block h-3 w-1/2 animate-pulse rounded-full bg-wd-blush" />
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-8">
            <ErrorState title="Booking belum bisa dimuat" body={error} onRetry={load} />
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="mt-10 flex flex-col items-center rounded-[28px] border-2 border-dashed border-wd-accent bg-wd-accent-wash px-6 py-12 text-center">
            <span className="block h-28 w-28">
              <ClientArt kind="shop" />
            </span>
            <h2 className="wd-title mt-4 text-[1.5rem]">Belum ada booking</h2>
            <p className="mt-2 max-w-md leading-relaxed text-wd-text">Setelah sepakat dengan vendor lewat chat, ajukan booking dari halaman vendornya. Pembayaran ditahan Dana Aman sampai acaramu selesai.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/vendors" className={wdButton()}>
                Cari vendor
              </Link>
              <Link href="/client/consultation" className={wdButton({ variant: "outline" })}>
                Minta rekomendasi konsultan
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <>
            {/* Three figures, plain with hairlines. The held amount leads. */}
            <dl className="mt-8 grid grid-cols-2 border-y border-wd-line py-5 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div className="col-span-2 border-b border-wd-line pb-4 sm:col-span-1 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-8">
                <dt className="text-[0.82rem] text-wd-text">Dana ditahan Dana Aman</dt>
                <dd className="wd-display mt-1 text-[2.2rem] leading-none tabular-nums text-wd-ink sm:text-[2.7rem]">
                  <CountUp value={held} format={formatRupiah} />
                </dd>
                <p className="mt-2 text-[0.8rem] text-wd-muted">{held > 0 ? "Aman di DuaCincin, diteruskan ke vendor setelah acaramu selesai." : "Belum ada pembayaran yang sedang ditahan."}</p>
              </div>
              <div className="border-r border-wd-line pt-4 sm:border-r sm:px-8 sm:pt-0">
                <dt className="text-[0.82rem] text-wd-text">Booking aktif</dt>
                <dd className="wd-display mt-1 text-[1.8rem] leading-none tabular-nums text-wd-ink sm:text-[2.2rem]">
                  <CountUp value={counts.active ?? 0} />
                </dd>
                <p className="mt-2 text-[0.8rem] text-wd-muted">{needsAction > 0 ? `${needsAction} menunggu tindakanmu` : "Tidak ada yang menunggumu"}</p>
              </div>
              <div className="pl-4 pt-4 sm:pl-8 sm:pt-0">
                <dt className="text-[0.82rem] text-wd-text">Sudah diteruskan</dt>
                <dd className="wd-display mt-1 text-[1.4rem] leading-tight tabular-nums text-wd-ink sm:text-[1.8rem]">{formatRupiah(released)}</dd>
                <p className="mt-2 text-[0.8rem] text-wd-muted">Ke vendor yang acaranya selesai</p>
              </div>
            </dl>

            <div role="tablist" aria-label="Status booking" className="wd-rail mt-6 flex gap-7 overflow-x-auto border-b border-wd-line">
              {BOOKING_FILTERS.map((f) => {
                const on = filter === f.key;
                return (
                  <button
                    key={f.key}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => setFilter(f.key)}
                    className={`relative min-h-11 shrink-0 pb-3 pt-2 text-[0.95rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-muted hover:text-wd-ink"}`}
                  >
                    {f.label} <span className="tabular-nums text-wd-muted">{counts[f.key] ?? 0}</span>
                    {on && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-wd-accent" />}
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <div className="mt-8 flex flex-col items-start gap-3">
                <p className="text-wd-text">Tidak ada booking di tab ini.</p>
                <button type="button" onClick={() => setFilter("all")} className={wdButton({ variant: "outline", size: "sm" })}>
                  Tampilkan semua
                </button>
              </div>
            ) : (
              <ul role="tabpanel" aria-label="Daftar booking" className="mt-6">
                {visible.map((b) => (
                  <Row key={b.id} b={b} vendor={vendors[b.vendor_id]} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </ClientShell>
  );
}
