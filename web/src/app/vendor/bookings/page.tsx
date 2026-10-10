"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BookingStatusFilter,
  matchesBookingFilter,
} from "@/components/BookingStatusFilter";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  ApiError,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  formatRupiah,
  type Booking,
  type CurrentUser,
} from "@/lib/api";

export default function VendorBookingsPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorBookingsContent user={user} />}
    </WithUser>
  );
}

function VendorBookingsContent({ user }: { user: CurrentUser }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [reload, setReload] = useState(0);

  useEffect(() => {
    apiGet<Booking[]>("/api/v1/bookings")
      .then((data) => {
        setBookings(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Gagal memuat booking.",
        );
        setLoading(false);
      });
  }, [reload]);

  return (
    <Shell
      user={user}
      navItems={VENDOR_NAV}
      loginPath="/login"
      eyebrow="Vendor"
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader title="Booking masuk" />
        {bookings.length > 0 && (
          <BookingStatusFilter value={filter} onChange={setFilter} />
        )}
        {loading && (
          <div
            className="flex flex-col gap-3"
            aria-busy="true"
            aria-label="Memuat booking"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-lg bg-dc-ink/5"
              />
            ))}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);

                setReload((n) => n + 1);
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-red-300 px-4 font-semibold hover:bg-red-100"
            >
              Coba lagi
            </button>
          </div>
        )}
        {!loading && !error && bookings.length === 0 && (
          <EmptyState
            title="Belum ada booking masuk"
            body="Booking dari client akan muncul di sini setelah profil kamu disetujui Admin."
          />
        )}
        <ul className="mt-4 flex flex-col gap-3">
          {bookings
            .filter((b) => matchesBookingFilter(b.status, filter))
            .map((b) => (
              <li key={b.id}>
                <Link
                  href={`/vendor/bookings/${b.id}`}
                  className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                >
                  <Card className="p-4 transition-colors hover:border-dc-ink/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-dc-ink">
                          {b.package_description || "Booking"}
                        </p>
                        <p className="mt-0.5 text-sm tabular-nums text-dc-black/70">
                          {b.event_date} · {formatRupiah(b.agreed_price)}
                        </p>
                      </div>
                      <Badge tone={BOOKING_STATUS_TONE[b.status]}>
                        {BOOKING_STATUS_LABEL[b.status]}
                      </Badge>
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
