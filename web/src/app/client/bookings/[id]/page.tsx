"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ErrorState, ERROR_TEXT, FOCUS, H2, INPUT, LABEL, LINK, Skeleton } from "@/app/client/_ui";
import { BookingStepper } from "@/components/BookingStepper";
import { FundStatus } from "@/components/ui/FundStatus";
import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
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
    setError(null);
    apiGet<Booking>(`/api/v1/bookings/${id}`).then(setBooking).catch(() => setError("Booking tidak ditemukan."));
    apiGet<Meeting[]>(`/api/v1/bookings/${id}/meetings`)
      .then((data) => setMeetings(data ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    queueMicrotask(load);
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
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <Link href="/client/bookings" className={`mb-2 ${LINK}`}>
          ← Semua booking
        </Link>
        {!booking ? (
          error ? (
            <ErrorState message={error} onRetry={load} />
          ) : (
            <div role="status" aria-label="Memuat" className="flex flex-col gap-4">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          )
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-dc-gold/40 pb-6">
              <div className="min-w-0">
                <h1 className="font-heading break-words text-3xl leading-tight text-dc-ink">{booking.package_description || "Booking"}</h1>
                <p className="mt-1 tabular-nums text-dc-black/70">{booking.event_date}</p>
              </div>
              <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
            </div>

            {booking.status !== "cancelled" && (
              <Card className="mb-6 p-5">
                <BookingStepper status={booking.status} />
              </Card>
            )}

            <Card className="mb-6 p-5">
              <FundStatus status={booking.status} />
            </Card>

            <Card className="mb-6 p-5">
              <dl className="flex flex-col gap-2 text-sm tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt className="text-dc-black/70">Total harga</dt>
                  <dd className="font-semibold text-dc-ink">{formatRupiah(booking.agreed_price)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-dc-ink/10 pt-2">
                  <dt className="text-dc-black/70">DP (30%)</dt>
                  <dd className="font-semibold text-dc-ink">{formatRupiah(booking.dp_amount)}</dd>
                </div>
              </dl>
            </Card>

            {error && <p role="alert" className={`mb-4 ${ERROR_TEXT}`}>{error}</p>}

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
                  <h2 className={`${H2} mb-2`}>Technical Meeting</h2>
                  {meetings
                    .filter((m) => m.type === "technical_meeting")
                    .map((m) => (
                      <p key={m.id} className="break-words text-sm text-dc-black/70">
                        {new Date(m.scheduled_at).toLocaleString("id-ID")} · {m.meeting_link}
                      </p>
                    ))}
                  {!hasTechnicalMeeting && (
                    <form onSubmit={handleScheduleMeeting} className="mt-3 flex flex-col gap-3">
                      <label htmlFor="tm-date" className={LABEL}>
                        Tanggal &amp; waktu
                      </label>
                      <input
                        id="tm-date"
                        type="datetime-local"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        required
                        className={INPUT}
                      />
                      <label htmlFor="tm-link" className={LABEL}>
                        Link meeting
                      </label>
                      <input
                        id="tm-link"
                        type="text"
                        placeholder="Link meeting (Zoom/Google Meet)"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        className={INPUT}
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

              {booking.status === "completed" && <ReviewSection bookingId={id} />}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

function ReviewSection({ bookingId }: { bookingId: string }) {
  const { show } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Pilih rating dulu, ya.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${bookingId}/review`, { rating, comment });
      setSubmitted(true);
      show("Terima kasih atas review-nya!", "success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSubmitted(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Gagal mengirim review.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <Card className="p-5">
        <h2 className={`${H2} mb-1`}>Review</h2>
        <p className="text-sm text-dc-black/70">Terima kasih, review kamu untuk vendor ini sudah tercatat.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className={`${H2} mb-3`}>Bagaimana pengalamanmu dengan vendor ini?</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div role="group" aria-label="Rating" className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`${star} bintang`}
              aria-pressed={star === rating}
              className={`flex h-11 w-11 items-center justify-center rounded-md text-2xl leading-none transition-colors hover:bg-dc-cream ${FOCUS}`}
            >
              <span aria-hidden className={star <= rating ? "text-dc-gold" : "text-dc-ink/20"}>★</span>
            </button>
          ))}
          <span className="ml-2 text-sm tabular-nums text-dc-black/70">{rating > 0 ? `${rating} dari 5` : "Belum dipilih"}</span>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Ceritakan pengalamanmu (opsional)"
          aria-label="Komentar"
          className={INPUT}
        />
        {error && <p role="alert" className={ERROR_TEXT}>{error}</p>}
        <Button type="submit" className="w-auto" loading={saving}>
          Kirim Review
        </Button>
      </form>
    </Card>
  );
}
