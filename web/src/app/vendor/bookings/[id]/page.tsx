"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { BookingStepper } from "@/components/BookingStepper";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { FundStatus } from "@/components/ui/FundStatus";
import { Modal } from "@/components/ui/Modal";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  countdownLabel,
  DateLeaf,
  formatTanggal,
  formatWaktu,
  VENDOR_STATUS,
} from "@/components/vendor-ops/ops";
import { AcceptedMoment, StaggerItem, StaggerList } from "@/components/vendor-ops/motion";
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

/** What the vendor should do at each stage, in one sentence. */
const GUIDANCE: Record<Booking["status"], { title: string; body: string }> = {
  requested: { title: "Client menunggu jawabanmu", body: "Cek tanggal dan paket. Kalau bisa, terima supaya client bisa membayar DP lewat DuaCincin." },
  confirmed: { title: "Menunggu DP dari client", body: "Kamu sudah menerima booking ini. Begitu client membayar DP, dananya ditahan escrow dan tanggalnya terkunci." },
  dp_paid: { title: "DP sudah masuk escrow", body: "Jadwalkan technical meeting dengan client untuk membahas detail hari-H." },
  full_paid: { title: "Booking sudah lunas", body: "Semua dana ditahan escrow sampai client menandai acara selesai. Pastikan technical meeting sudah terjadwal." },
  completed: { title: "Acara selesai", body: "Dana bersih (setelah komisi) masuk antrean pencairan. Admin mentransfernya ke rekeningmu." },
  cancelled: { title: "Booking dibatalkan", body: "Tidak ada yang perlu kamu lakukan. Dana client mengikuti ketentuan pembatalan." },
};

function VendorBookingDetailContent({ id, user }: { id: string; user: CurrentUser }) {
  const toast = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<"confirm" | "cancel" | "meeting" | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [moment, setMoment] = useState<"accepted" | "scheduled" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  function load() {
    apiGet<Booking>(`/api/v1/bookings/${id}`)
      .then((b) => {
        setBooking(b);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true));
    apiGet<Meeting[]>(`/api/v1/bookings/${id}/meetings`)
      .then((data) => setMeetings(data ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    setBusy("confirm");
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${id}/confirm`, {});
      setMoment("accepted");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengonfirmasi booking.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    setBusy("cancel");
    setError(null);
    try {
      await apiPost(`/api/v1/bookings/${id}/cancel`, {});
      setDeclineOpen(false);
      toast.show("Permintaan booking ditolak.", "success");
      load();
    } catch (err) {
      setDeclineOpen(false);
      setError(err instanceof ApiError ? err.message : "Gagal membatalkan booking.");
    } finally {
      setBusy(null);
    }
  }

  async function handleScheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    setBusy("meeting");
    setError(null);
    try {
      const iso = new Date(meetingDate).toISOString();
      await apiPost(`/api/v1/bookings/${id}/meetings`, {
        scheduled_at: iso,
        meeting_link: meetingLink,
      });
      setMeetingDate("");
      setMeetingLink("");
      setSheetOpen(false);
      setMoment("scheduled");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menjadwalkan meeting.");
      setSheetOpen(false);
    } finally {
      setBusy(null);
    }
  }

  const hasTechnicalMeeting = meetings.some((m) => m.type === "technical_meeting");
  const canSchedule = !!booking && (booking.status === "dp_paid" || booking.status === "full_paid") && !hasTechnicalMeeting;

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/vendor/bookings"
          className="-ml-1 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
        >
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Semua booking
        </Link>

        {!booking ? (
          loadFailed ? (
            <ErrorState
              title="Booking tidak ditemukan"
              body="Booking ini tidak bisa dibuka. Periksa koneksimu atau kembali ke daftar booking."
              onRetry={() => {
                setLoadFailed(false);
                load();
              }}
            />
          ) : (
            <SkeletonGroup label="Memuat booking" className="flex flex-col gap-4">
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-28 rounded-xl" />
            </SkeletonGroup>
          )
        ) : (
          <>
            <header className="animate-fade-up flex items-start gap-4">
              <DateLeaf value={booking.event_date} tone={booking.status === "requested" ? "gold" : "light"} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={booking.status === "requested" ? "gold" : BOOKING_STATUS_TONE[booking.status]}>{VENDOR_STATUS[booking.status]}</Badge>
                  {booking.status !== "completed" && booking.status !== "cancelled" && (
                    <span className="text-sm font-medium text-dc-text-3">{countdownLabel(booking.event_date)}</span>
                  )}
                </div>
                <h1 className="mt-2 break-words font-heading text-[2.1rem] leading-[1.08] text-dc-ink sm:text-[2.75rem]">
                  {booking.package_description || "Booking"}
                </h1>
                <p className="mt-1.5 text-dc-text-2">{formatTanggal(booking.event_date, true)}</p>
              </div>
            </header>

            {error && (
              <div className="mt-6">
                <ErrorState compact title="Belum berhasil" body={error} />
              </div>
            )}

            {/* Focal block: what this booking needs from the vendor right now. */}
            <section
              aria-labelledby="tindakan"
              className={`mt-8 rounded-2xl border p-5 sm:p-7 ${booking.status === "requested" ? "border-dc-gold/70 bg-dc-white shadow-lift" : "border-dc-line bg-dc-white shadow-soft"}`}
            >
              <p className="dc-eyebrow">Langkah berikutnya</p>
              <h2 id="tindakan" className="mt-2 font-heading text-[1.9rem] leading-tight text-dc-ink">
                {GUIDANCE[booking.status].title}
              </h2>
              <p className="mt-1.5 leading-relaxed text-dc-text-2">{GUIDANCE[booking.status].body}</p>

              {moment && (
                <div className="mt-5">
                  {moment === "accepted" ? (
                    <AcceptedMoment title="Booking diterima" body="Client sudah diberi tahu dan bisa membayar DP lewat DuaCincin." />
                  ) : (
                    <AcceptedMoment title="Technical meeting terjadwal" body="Jadwalnya muncul di booking client dan di daftar meeting di bawah." />
                  )}
                </div>
              )}

              {booking.status === "requested" && (
                <div className="mt-6 hidden gap-3 md:flex">
                  <Button variant="gold" size="lg" onClick={handleConfirm} loading={busy === "confirm"} disabled={busy !== null}>
                    Terima booking
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => setDeclineOpen(true)} disabled={busy !== null}>
                    Tolak
                  </Button>
                </div>
              )}
              {canSchedule && (
                <Button variant="gold" size="lg" className="mt-6 hidden md:inline-flex" onClick={() => setSheetOpen(true)}>
                  Jadwalkan technical meeting
                </Button>
              )}
              {booking.status === "completed" && (
                <ButtonLink href="/vendor/payouts" variant="ghost" className="mt-6">
                  Lihat pencairan
                </ButtonLink>
              )}

            </section>

            <section aria-labelledby="dana" className="mt-6">
              <h2 id="dana" className="mb-3 font-heading text-2xl text-dc-ink">
                Dana booking
              </h2>
              <Card className="p-0">
                <div className="flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
                  <div>
                    <p className="text-sm font-medium text-dc-text-2">Harga disepakati</p>
                    <p className="mt-0.5 font-heading text-[2.2rem] font-semibold leading-tight text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatRupiah(booking.agreed_price)}
                    </p>
                  </div>
                  <FundStatus status={booking.status} />
                </div>
                <dl className="divide-y divide-dc-line border-t border-dc-line text-sm">
                  <div className="flex justify-between gap-4 px-5 py-3.5 sm:px-6">
                    <dt className="text-dc-text-2">DP (30%)</dt>
                    <dd className="font-semibold tabular-nums text-dc-ink">{formatRupiah(booking.dp_amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-5 py-3.5 sm:px-6">
                    <dt className="text-dc-text-2">Pelunasan</dt>
                    <dd className="font-semibold tabular-nums text-dc-ink">{formatRupiah(Math.max(0, booking.agreed_price - booking.dp_amount))}</dd>
                  </div>
                </dl>
                <p className="rounded-b-xl border-t border-dc-line bg-dc-cream/60 px-5 py-3.5 text-xs leading-relaxed text-dc-text-2 sm:px-6">
                  Client membayar lewat DuaCincin. Dana ditahan escrow dan diteruskan ke kamu (dikurangi komisi) setelah client menandai acara selesai.
                </p>
              </Card>
            </section>

            {booking.status !== "cancelled" && (
              <section aria-labelledby="tahapan" className="mt-8">
                <h2 id="tahapan" className="mb-3 font-heading text-2xl text-dc-ink">
                  Tahapan booking
                </h2>
                <Card className="p-5 sm:p-6">
                  <p className="sr-only">{BOOKING_STATUS_LABEL[booking.status]}</p>
                  <BookingStepper status={booking.status} />
                </Card>
              </section>
            )}

            <section aria-labelledby="jadwal" className="mt-8">
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 id="jadwal" className="font-heading text-2xl text-dc-ink">
                  Jadwal meeting
                </h2>
                {canSchedule && (
                  <Button variant="quiet" size="sm" onClick={() => setSheetOpen(true)}>
                    Tambah jadwal
                  </Button>
                )}
              </div>
              {meetings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-5 py-6 text-sm leading-relaxed text-dc-text-2">
                  {booking.status === "dp_paid" || booking.status === "full_paid"
                    ? "Belum ada meeting. Jadwalkan technical meeting supaya detail hari-H jelas untuk kedua pihak."
                    : "Technical meeting bisa dijadwalkan setelah client membayar DP."}
                </p>
              ) : (
                <StaggerList>
                  {meetings.map((m) => (
                    <StaggerItem key={m.id}>
                      <Card className="p-5">
                        <p className="text-sm font-semibold text-dc-clay">{m.type === "technical_meeting" ? "Technical meeting" : "Konsultasi"}</p>
                        <p className="mt-1 font-semibold text-dc-ink">{formatWaktu(m.scheduled_at)}</p>
                        {m.meeting_link &&
                          (/^https?:\/\//.test(m.meeting_link) ? (
                            <a
                              href={m.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex min-h-11 max-w-full items-center break-all text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                            >
                              Buka link meeting<span className="sr-only"> (tab baru)</span>
                            </a>
                          ) : (
                            <p className="mt-1 break-words text-sm text-dc-text-2">{m.meeting_link}</p>
                          ))}
                      </Card>
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </section>

            {/* Mobile: the deciding buttons stay under the thumb, above the tab bar. */}
            {(booking.status === "requested" || canSchedule) && (
              <div className="sticky bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-30 -mx-4 mt-8 border-t border-dc-line bg-dc-white/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(21,17,13,0.3)] md:hidden">
                {booking.status === "requested" ? (
                  <div className="grid grid-cols-[1fr_2fr] gap-3">
                    <Button variant="ghost" onClick={() => setDeclineOpen(true)} disabled={busy !== null}>
                      Tolak
                    </Button>
                    <Button variant="gold" onClick={handleConfirm} loading={busy === "confirm"} disabled={busy !== null}>
                      Terima booking
                    </Button>
                  </div>
                ) : (
                  <Button variant="gold" block onClick={() => setSheetOpen(true)}>
                    Jadwalkan technical meeting
                  </Button>
                )}
              </div>
            )}

            <Modal
              open={declineOpen}
              onClose={() => setDeclineOpen(false)}
              title="Tolak permintaan ini?"
              description={`${booking.package_description || "Booking"}, ${formatTanggal(booking.event_date)}. Client akan diberi tahu dan bisa mencari vendor lain.`}
              size="sm"
            >
              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setDeclineOpen(false)}>
                  Kembali
                </Button>
                <Button variant="danger" onClick={handleCancel} loading={busy === "cancel"}>
                  Ya, tolak booking
                </Button>
              </div>
            </Modal>

            <Sheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              title="Technical meeting"
              description="Pilih waktu dan tempel link meeting. Client melihat jadwal ini di booking-nya."
              footer={
                <Button type="submit" form="form-meeting" variant="gold" block loading={busy === "meeting"}>
                  Jadwalkan
                </Button>
              }
            >
              <form id="form-meeting" onSubmit={handleScheduleMeeting} className="flex flex-col gap-5">
                <Input label="Tanggal dan jam" type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
                <Input
                  label="Link meeting"
                  optional
                  hint="Zoom atau Google Meet. Bisa dikosongkan kalau bertemu langsung."
                  type="text"
                  inputMode="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </form>
            </Sheet>
          </>
        )}
      </div>
    </Shell>
  );
}
