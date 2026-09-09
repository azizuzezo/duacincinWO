"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, BOOKING_STATUS_LABEL, formatRupiah, type Booking } from "@/lib/api";

export default function ClientBookingsPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {() => <ClientBookingsContent />}
    </WithUser>
  );
}

function ClientBookingsContent() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-extrabold text-dc-navy">Booking Saya</h1>
      {loading && <p className="text-dc-black/60">Memuat…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && bookings.length === 0 && (
        <p className="text-dc-black/60">Belum ada booking. Cari vendor dulu untuk mengajukan booking.</p>
      )}
      <ul className="flex flex-col gap-3">
        {bookings.map((b) => (
          <li key={b.id}>
            <Link href={`/client/bookings/${b.id}`} className="block rounded-2xl border border-dc-black/10 bg-dc-white p-4 hover:shadow-md">
              <p className="font-medium text-dc-navy">{b.package_description || "Booking"}</p>
              <p className="text-sm text-dc-black/60">
                {b.event_date} · {formatRupiah(b.agreed_price)}
              </p>
              <p className="mt-1 text-xs font-semibold text-dc-gold">{BOOKING_STATUS_LABEL[b.status]}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
