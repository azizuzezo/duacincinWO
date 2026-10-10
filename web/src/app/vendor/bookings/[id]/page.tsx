"use client";

import { use, useEffect, useState } from "react";

import { BookingStepper } from "@/components/BookingStepper";
import { Button } from "@/components/Button";
import { VENDOR_NAV } from "@/components/shell/navConfig";
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

export default function VendorBookingDetailPage({
  params,
}: PageProps<"/vendor/bookings/[id]">) {
  const { id } = use(params);
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorBookingDetailContent id={id} user={user} />}
    </WithUser>
  );
}

function VendorBookingDetailContent({
  id,
  user,
}: {
  id: string;
  user: CurrentUser;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  function load() {
    apiGet<Booking>(`/api/v1/bookings/${id}`)
      .then(setBooking)
      .catch(() => setError("Booking tidak ditemukan."));
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
      setError(
        err instanceof ApiError ? err.message : "Gagal mengonfirmasi booking.",
      );
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
      setError(
        err instanceof ApiError ? err.message : "Gagal membatalkan booking.",
      );
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
      await apiPost(`/api/v1/bookings/${id}/meetings`, {
        scheduled_at: iso,
        meeting_link: meetingLink,
      });
      setMeetingDate("");
      setMeetingLink("");
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menjadwalkan meeting.",
      );
    } finally {
      setBusy(false);
    }
  }

  const hasTechnicalMeeting = meetings.some(
    (m) => m.type === "technical_meeting",
  );

  return (
    <Shell
      user={user}
      navItems={VENDOR_NAV}
      loginPath="/login"
      eyebrow="Vendor"
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {!booking ? (
          error ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  load();
                }}
                className="inline-flex min-h-11 items-center rounded-md border border-red-300 px-4 font-semibold hover:bg-red-100"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <div
              className="flex flex-col gap-4"
              aria-busy="true"
              aria-label="Memuat booking"
            >
              <div className="h-12 w-2/3 animate-pulse rounded-md bg-dc-ink/5" />
              <div className="h-24 animate-pulse rounded-lg bg-dc-ink/5" />
              <div className="h-20 animate-pulse rounded-lg bg-dc-ink/5" />
            </div>
          )
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-dc-gold/40 pb-6">
              <div className="min-w-0">
                <h1 className="font-heading text-4xl leading-tight text-dc-ink sm:text-[2.75rem]">
                  {booking.package_description || "Booking"}
                </h1>
                <p className="mt-2 tabular-nums text-dc-black/70">
                  {booking.event_date}
                </p>
              </div>
              <Badge tone={BOOKING_STATUS_TONE[booking.status]}>
                {BOOKING_STATUS_LABEL[booking.status]}
              </Badge>
            </div>

            {booking.status !== "cancelled" && (
              <Card className="mb-4 overflow-x-auto p-5">
                <BookingStepper status={booking.status} />
              </Card>
            )}

            <Card className="mb-4 p-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-dc-black/70">Total harga</span>
                <span className="font-semibold tabular-nums text-dc-ink">
                  {formatRupiah(booking.agreed_price)}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4 border-t border-dc-ink/10 pt-2 text-sm">
                <span className="text-dc-black/70">DP (30%)</span>
                <span className="font-semibold tabular-nums text-dc-ink">
                  {formatRupiah(booking.dp_amount)}
                </span>
              </div>
            </Card>

            {error && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}

            {booking.status === "requested" && (
              <div className="flex flex-wrap gap-3">
                <Button
                  className="w-auto"
                  onClick={handleConfirm}
                  loading={busy}
                >
                  Konfirmasi Booking
                </Button>
                <Button
                  variant="ghost"
                  className="w-auto"
                  onClick={handleCancel}
                  loading={busy}
                >
                  Tolak
                </Button>
              </div>
            )}

            {meetings.length > 0 && (
              <Card className="mt-4 p-5">
                <h2 className="font-heading mb-3 text-2xl text-dc-ink">
                  Meeting
                </h2>
                {meetings.map((m) => (
                  <p
                    key={m.id}
                    className="break-words text-sm text-dc-black/70"
                  >
                    {m.type === "technical_meeting"
                      ? "Technical Meeting"
                      : "Konsultasi"}
                    : {new Date(m.scheduled_at).toLocaleString("id-ID")} ·{" "}
                    {m.meeting_link}
                  </p>
                ))}
              </Card>
            )}

            {(booking.status === "dp_paid" || booking.status === "full_paid") &&
              !hasTechnicalMeeting && (
                <Card className="mt-4 p-5">
                  <h2 className="font-heading mb-3 text-2xl text-dc-ink">
                    Jadwalkan technical meeting
                  </h2>
                  <form
                    onSubmit={handleScheduleMeeting}
                    className="flex flex-col gap-3"
                  >
                    <input
                      type="datetime-local"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      required
                      className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
                    />
                    <input
                      type="text"
                      placeholder="Link meeting (Zoom/Google Meet)"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
                    />
                    <Button type="submit" className="w-auto" loading={busy}>
                      Jadwalkan
                    </Button>
                  </form>
                </Card>
              )}
          </>
        )}
      </div>
    </Shell>
  );
}
