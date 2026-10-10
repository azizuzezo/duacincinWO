"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BookingStatusFilter, matchesBookingFilter } from "@/components/BookingStatusFilter";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FundStatus } from "@/components/ui/FundStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, FOCUS, SkeletonList } from "@/app/client/_ui";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE, formatRupiah, type Booking, type CurrentUser } from "@/lib/api";

export default function ClientBookingsPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientBookingsContent user={user} />}
    </WithUser>
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

  const visible = bookings.filter((b) => matchesBookingFilter(b.status, filter));

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <PageHeader title="Booking Saya" subtitle="Pantau status dan pembayaran tiap vendor." />

        {bookings.length > 0 && <BookingStatusFilter value={filter} onChange={setFilter} />}

        {loading && <SkeletonList rows={4} />}
        {error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && bookings.length === 0 && (
          <EmptyState title="Belum ada booking" body="Cari vendor dulu untuk mengajukan booking." actionHref="/vendors" actionLabel="Cari vendor" />
        )}
        {!loading && !error && bookings.length > 0 && visible.length === 0 && (
          <p className="rounded-lg border border-dashed border-dc-ink/20 px-4 py-10 text-center text-sm text-dc-black/70">
            Tidak ada booking pada filter ini.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {visible.map((b) => (
            <li key={b.id}>
              <Link href={`/client/bookings/${b.id}`} className={`group block rounded-lg ${FOCUS}`}>
                <Card className="p-4 transition-colors group-hover:border-dc-ink/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-dc-ink">{b.package_description || "Booking"}</p>
                      <p className="mt-0.5 text-sm tabular-nums text-dc-black/70">
                        {b.event_date} · {formatRupiah(b.agreed_price)}
                      </p>
                    </div>
                    <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                  </div>
                  <div className="mt-3 border-t border-dc-ink/10 pt-3">
                    <FundStatus status={b.status} compact />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}
