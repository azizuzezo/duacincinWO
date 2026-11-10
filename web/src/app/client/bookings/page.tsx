"use client";

import { useEffect, useState } from "react";

import { BookingCard, BookingCardSkeleton, CLIENT_NEXT_ACTION } from "@/components/booking/BookingCard";
import { useVendorLookup } from "@/components/booking/useVendorLookup";
import { BookingStatusFilter, countBookingFilters, matchesBookingFilter } from "@/components/BookingStatusFilter";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CountUp, MotionItem, MotionList } from "@/components/ui/Motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, formatRupiah, type Booking, type BookingStatus, type CurrentUser } from "@/lib/api";

export default function ClientBookingsPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientBookingsContent user={user} />}
    </WithUser>
  );
}

// Active bookings first (soonest event on top), then finished, then cancelled.
const ORDER: Record<BookingStatus, number> = { confirmed: 0, dp_paid: 0, full_paid: 0, requested: 0, completed: 1, cancelled: 2 };

/** Money the couple has paid that DuaCincin is holding, from real booking data. */
function heldAmount(b: Booking): number {
  if (b.status === "dp_paid") return b.dp_amount;
  if (b.status === "full_paid") return b.agreed_price;
  return 0;
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
  const held = bookings.reduce((sum, b) => sum + heldAmount(b), 0);
  const released = bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.agreed_price, 0);
  const needsAction = bookings.filter((b) => CLIENT_NEXT_ACTION[b.status]).length;
  const active = bookings.filter((b) => matchesBookingFilter(b.status, "active")).length;

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          eyebrow="Booking"
          title={
            <>
              Booking <span className="dc-em">vendormu</span>
            </>
          }
          subtitle="Tahap tiap vendor dan di mana uangmu berada sekarang."
          action={
            bookings.length > 0 ? (
              <ButtonLink href="/vendors" variant="ghost" size="sm">
                Cari vendor lain
              </ButtonLink>
            ) : undefined
          }
        />

        {loading && (
          <SkeletonGroup label="Memuat booking" className="flex flex-col gap-4">
            <span className="dc-skeleton block h-32 rounded-xl" />
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </SkeletonGroup>
        )}

        {!loading && error && <ErrorState title="Booking belum bisa dimuat" body={error} onRetry={load} />}

        {!loading && !error && bookings.length === 0 && (
          <EmptyState
            title="Belum ada booking"
            body="Setelah kamu sepakat dengan vendor lewat chat, ajukan booking dari halaman vendornya. Semua pembayaran ditahan escrow sampai acaramu selesai."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href="/vendors" size="sm">
                  Cari vendor
                </ButtonLink>
                <ButtonLink href="/client/consultation" variant="ghost" size="sm">
                  Minta rekomendasi konsultan
                </ButtonLink>
              </div>
            }
          />
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="animate-fade-up">
            {/* Escrow summary: the held amount is the one figure that matters most, so it leads. */}
            <section aria-label="Ringkasan dana" className="mb-8 grid gap-px overflow-hidden rounded-xl border border-dc-line bg-dc-line shadow-soft grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div className="col-span-2 bg-dc-white p-5 sm:col-span-1 sm:p-6">
                <p className="text-sm font-medium text-dc-text-2">Dana ditahan escrow</p>
                <p className="mt-1 font-heading text-[2.4rem] leading-none lining-nums tabular-nums text-dc-ink sm:text-[2.75rem]">
                  <CountUp value={held} format={formatRupiah} />
                </p>
                <p className="mt-2 text-xs leading-relaxed text-dc-text-3">
                  {held > 0 ? "Aman di DuaCincin, diteruskan ke vendor setelah acaramu selesai." : "Belum ada pembayaran yang sedang ditahan."}
                </p>
              </div>
              <div className="bg-dc-white p-4 sm:p-6">
                <p className="text-sm font-medium text-dc-text-2">Booking aktif</p>
                <p className="mt-1 font-heading text-[2.2rem] leading-none lining-nums tabular-nums text-dc-ink">
                  <CountUp value={active} />
                </p>
                <p className="mt-2 text-xs text-dc-text-3">
                  {needsAction > 0 ? `${needsAction} menunggu tindakanmu` : "Tidak ada yang menunggumu"}
                </p>
              </div>
              <div className="bg-dc-white p-4 sm:p-6">
                <p className="text-sm font-medium text-dc-text-2">Sudah diteruskan</p>
                <p className="mt-1 text-xl font-bold leading-tight tabular-nums text-dc-ink">{formatRupiah(released)}</p>
                <p className="mt-2 text-xs text-dc-text-3">Ke vendor yang acaranya selesai</p>
              </div>
            </section>

            <BookingStatusFilter value={filter} onChange={setFilter} counts={countBookingFilters(bookings.map((b) => b.status))} />

            {visible.length === 0 ? (
              <EmptyState
                title="Tidak ada booking di sini"
                body="Coba pilih filter lain untuk melihat booking lainnya."
                action={
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="inline-flex min-h-11 items-center rounded-full border border-dc-line-strong px-5 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                  >
                    Tampilkan semua
                  </button>
                }
              />
            ) : (
              <MotionList className="flex flex-col gap-4">
                {visible.map((b) => (
                  <MotionItem key={b.id}>
                    <BookingCard booking={b} vendor={vendors[b.vendor_id]} />
                  </MotionItem>
                ))}
              </MotionList>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
