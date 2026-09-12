"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BookingStatusFilter, matchesBookingFilter } from "@/components/BookingStatusFilter";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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

  useEffect(() => {
    apiGet<Booking[]>("/api/v1/bookings")
      .then((data) => {
        setBookings(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat booking.");
        setLoading(false);
      });
  }, []);

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title="Booking Saya" />

        {bookings.length > 0 && <BookingStatusFilter value={filter} onChange={setFilter} />}

        {loading && <p className="text-dc-black/60">Memuat…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && bookings.length === 0 && (
          <EmptyState title="Belum ada booking" body="Cari vendor dulu untuk mengajukan booking." actionHref="/vendors" actionLabel="Cari Vendor" />
        )}
        <ul className="flex flex-col gap-3">
          {bookings
            .filter((b) => matchesBookingFilter(b.status, filter))
            .map((b) => (
            <li key={b.id}>
              <Link href={`/client/bookings/${b.id}`}>
                <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-dc-navy">{b.package_description || "Booking"}</p>
                      <p className="text-sm text-dc-black/60">
                        {b.event_date} · {formatRupiah(b.agreed_price)}
                      </p>
                    </div>
                    <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
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
