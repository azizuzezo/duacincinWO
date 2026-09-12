"use client";

import { use, useEffect, useState } from "react";

import { BookingStepper } from "@/components/BookingStepper";
import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  apiPost,
  ApiError,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  formatRupiah,
  type Booking,
  type CurrentUser,
  type Meeting,
} from "@/lib/api";

export default function ClientBookingDetailPage({ params }: PageProps<"/client/bookings/[id]">) {
  const { id } = use(params);
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientBookingDetailContent id={id} user={user} />}
    </WithUser>
  );
}

function ClientBookingDetailContent({ id, user }: { id: string; user: CurrentUser }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devPending, setDevPending] = useState<"dp" | "full" | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

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

  async function handlePay(type: "dp" | "full") {
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ dev_mode: boolean; redirect_url?: string }>(`/api/v1/bookings/${id}/pay/${type}`, {});
      if (res.dev_mode) {
        setDevPending(type);
      } else if (res.redirect_url) {
        window.location.href = res.redirect_url;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memulai pembayaran.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSimulate(type: "dp" | "full") {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${id}/dev-simulate-payment`, { type });
      setDevPending(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal simulasi pembayaran.");
    } finally {
      setBusy(false);
    }
  }

  async function handleScheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const iso = new Date(meetingDate).toISOString();
      await apiPost(`/api/v1/bookings/${id}/meetings`, { scheduled_at: iso, meeting_link: meetingLink });
      setMeetingDate("");
      setMeetingLink("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menjadwalkan meeting.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${id}/complete`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyelesaikan booking.");
    } finally {
      setBusy(false);
    }
  }

  const hasTechnicalMeeting = meetings.some((m) => m.type === "technical_meeting");

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {!booking ? (
          <p className="text-center text-dc-black/60">{error || "Memuat…"}</p>
        ) : (
          <>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-extrabold text-dc-navy">{booking.package_description || "Booking"}</h1>
                <p className="mt-1 text-dc-black/60">{booking.event_date}</p>
              </div>
              <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
            </div>

            {booking.status !== "cancelled" && (
              <Card className="mb-6 p-5">
                <BookingStepper status={booking.status} />
              </Card>
            )}

            <Card className="mb-6 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-dc-black/60">Total Harga</span>
                <span className="font-semibold text-dc-navy">{formatRupiah(booking.agreed_price)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-dc-black/60">DP (30%)</span>
                <span className="font-semibold text-dc-navy">{formatRupiah(booking.dp_amount)}</span>
              </div>
            </Card>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="flex flex-col gap-4">
              {booking.status === "confirmed" && (
                <Card className="p-5">
                  <Button className="w-auto" onClick={() => handlePay("dp")} loading={busy}>
                    Bayar DP ({formatRupiah(booking.dp_amount)})
                  </Button>
                  {devPending === "dp" && (
                    <Button variant="ghost" className="mt-2 w-auto" onClick={() => handleSimulate("dp")} loading={busy}>
                      Simulasikan Pembayaran DP Berhasil (Dev Mode)
                    </Button>
                  )}
                </Card>
              )}

              {booking.status === "dp_paid" && (
                <Card className="p-5">
                  <Button className="w-auto" onClick={() => handlePay("full")} loading={busy}>
                    Bayar Pelunasan ({formatRupiah(booking.agreed_price - booking.dp_amount)})
                  </Button>
                  {devPending === "full" && (
                    <Button variant="ghost" className="mt-2 w-auto" onClick={() => handleSimulate("full")} loading={busy}>
                      Simulasikan Pelunasan Berhasil (Dev Mode)
                    </Button>
                  )}
                </Card>
              )}

              {(booking.status === "dp_paid" || booking.status === "full_paid") && (
                <Card className="p-5">
                  <h2 className="font-heading mb-2 font-bold text-dc-navy">Technical Meeting</h2>
                  {meetings
                    .filter((m) => m.type === "technical_meeting")
                    .map((m) => (
                      <p key={m.id} className="text-sm text-dc-black/70">
                        {new Date(m.scheduled_at).toLocaleString("id-ID")} · {m.meeting_link}
                      </p>
                    ))}
                  {!hasTechnicalMeeting && (
                    <form onSubmit={handleScheduleMeeting} className="mt-2 flex flex-col gap-2">
                      <input
                        type="datetime-local"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        required
                        className="rounded-xl border border-dc-black/15 px-3 py-2 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                      />
                      <input
                        type="text"
                        placeholder="Link meeting (Zoom/Google Meet)"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        className="rounded-xl border border-dc-black/15 px-3 py-2 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                      />
                      <Button type="submit" className="w-auto" loading={busy}>
                        Jadwalkan
                      </Button>
                    </form>
                  )}
                </Card>
              )}

              {booking.status === "full_paid" && hasTechnicalMeeting && (
                <Button className="w-auto" onClick={handleComplete} loading={busy}>
                  Tandai Acara Selesai
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
