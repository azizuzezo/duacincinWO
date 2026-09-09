"use client";

import { use, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, BOOKING_STATUS_LABEL, formatRupiah, type Booking, type Meeting } from "@/lib/api";

export default function VendorBookingDetailPage({ params }: PageProps<"/vendor/bookings/[id]">) {
  const { id } = use(params);
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/vendor/login">
      {() => <VendorBookingDetailContent id={id} />}
    </WithUser>
  );
}

function VendorBookingDetailContent({ id }: { id: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiGet<Booking>(`/api/v1/bookings/${id}`).then(setBooking).catch(() => setError("Booking tidak ditemukan."));
    apiGet<Meeting[]>(`/api/v1/bookings/${id}/meetings`)
      .then((data) => setMeetings(data ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${id}/confirm`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengonfirmasi booking.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Batalkan booking ini?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${id}/cancel`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membatalkan booking.");
    } finally {
      setBusy(false);
    }
  }

  if (!booking) return <p className="p-8 text-center text-dc-black/60">{error || "Memuat…"}</p>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-extrabold text-dc-navy">{booking.package_description || "Booking"}</h1>
      <p className="mt-1 text-dc-black/60">{booking.event_date}</p>
      <p className="mt-2 font-medium text-dc-navy">
        Total: {formatRupiah(booking.agreed_price)} (DP {formatRupiah(booking.dp_amount)})
      </p>
      <p className="mt-1 text-sm font-semibold text-dc-gold">{BOOKING_STATUS_LABEL[booking.status]}</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        {booking.status === "requested" && (
          <>
            <Button className="w-auto" onClick={handleConfirm} loading={busy}>
              Konfirmasi Booking
            </Button>
            <Button variant="ghost" className="w-auto" onClick={handleCancel} loading={busy}>
              Tolak
            </Button>
          </>
        )}
      </div>

      {meetings.length > 0 && (
        <div className="mt-6 rounded-2xl border border-dc-black/10 bg-dc-white p-4">
          <h2 className="font-heading mb-2 font-bold text-dc-navy">Meeting</h2>
          {meetings.map((m) => (
            <p key={m.id} className="text-sm text-dc-black/70">
              {m.type === "technical_meeting" ? "Technical Meeting" : "Konsultasi"}: {new Date(m.scheduled_at).toLocaleString("id-ID")} — {m.meeting_link}
            </p>
          ))}
        </div>
      )}
    </main>
  );
}
