"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { FundStatus } from "@/components/ui/FundStatus";
import { Modal } from "@/components/ui/Modal";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { BookingJourney } from "@/components/vendor-ops/BookingJourney";
import { countdownLabel, formatTanggal, formatWaktu, VENDOR_STATUS } from "@/components/vendor-ops/ops";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  apiPost,
  ApiError,
  formatRupiah,
  type Booking,
  type CurrentUser,
  type Meeting,
} from "@/lib/api";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

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
  confirmed: { title: "Menunggu DP dari client", body: "Kamu sudah menerima booking ini. Begitu client membayar DP, dananya ditahan Dana Aman dan tanggalnya terkunci." },
  dp_paid: { title: "DP sudah masuk Dana Aman", body: "Jadwalkan technical meeting dengan client untuk membahas detail hari-H." },
  full_paid: { title: "Booking sudah lunas", body: "Semua dana ditahan Dana Aman sampai client menandai acara selesai. Pastikan technical meeting sudah terjadwal." },
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
    queueMicrotask(load);
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
  const showBar = !!booking && (booking.status === "requested" || canSchedule || booking.status === "completed");

  return (
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container pb-8 pt-6 sm:pt-8">
        <Link href="/vendor/bookings" className={`-ml-2 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-wd-accent-ink hover:bg-wd-accent-wash ${FOCUS}`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
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
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-6 h-64 rounded-2xl" />
            </SkeletonGroup>
          )
        ) : (
          <div className="animate-fade-up">
            <header>
              <p className="wd-kicker">{VENDOR_STATUS[booking.status]}</p>
              <h1 className="wd-display mt-2 break-words text-[clamp(2rem,4.2vw,3.2rem)] leading-[1.05]">{booking.package_description || "Booking"}</h1>
              <p className="mt-2 text-wd-text">
                <span className="font-semibold text-wd-ink">{formatTanggal(booking.event_date, true)}</span>
                {booking.status !== "completed" && booking.status !== "cancelled" && countdownLabel(booking.event_date) && <span className="text-wd-muted"> · {countdownLabel(booking.event_date)}</span>}
              </p>
            </header>

            {error && (
              <div className="mt-6">
                <ErrorState compact title="Belum berhasil" body={error} />
              </div>
            )}

            {/* What this booking needs from the vendor right now, as a soft strip. */}
            <section aria-labelledby="tindakan" className={`mt-8 flex items-start gap-4 rounded-[24px] bg-wd-accent-wash p-5 sm:px-7 ${booking.status === "requested" ? "ring-2 ring-wd-accent" : ""}`}>
              <span aria-hidden className="hidden h-14 w-14 shrink-0 rounded-2xl bg-white/70 p-2.5 sm:block">
                <ClientArt kind={booking.status === "requested" ? "envelope" : booking.status === "confirmed" || booking.status === "completed" ? "coin" : "clipboard"} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-wd-accent-ink">Langkah berikutnya</p>
                <h2 id="tindakan" className="wd-display mt-0.5 text-[clamp(1.3rem,2.2vw,1.7rem)] leading-tight">
                  {GUIDANCE[booking.status].title}
                </h2>
                <p className="mt-1 max-w-2xl text-[0.95rem] leading-relaxed text-wd-text">{GUIDANCE[booking.status].body}</p>
                {moment && (
                  <p role="status" className="mt-3 text-sm font-semibold text-wd-ink">
                    {moment === "accepted" ? "Booking diterima. Client sudah diberi tahu dan bisa membayar DP lewat DuaCincin." : "Technical meeting terjadwal. Client melihatnya di booking-nya."}
                  </p>
                )}
              </div>
            </section>

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
              <div className="flex min-w-0 flex-col gap-10">
                {booking.status !== "cancelled" && (
                  <section aria-labelledby="tahapan">
                    <h2 id="tahapan" className="wd-title text-[1.5rem] leading-tight">
                      Perjalanan <em>booking</em>
                    </h2>
                    <div className="mt-5">
                      <BookingJourney status={booking.status} meetings={meetings} />
                    </div>
                  </section>
                )}

                <section aria-labelledby="jadwal">
                  <div className="flex items-end justify-between gap-3">
                    <h2 id="jadwal" className="wd-title text-[1.5rem] leading-tight">
                      Jadwal <em>meeting</em>
                    </h2>
                    {canSchedule && (
                      <button type="button" onClick={() => setSheetOpen(true)} className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
                        Tambah jadwal
                      </button>
                    )}
                  </div>
                  {meetings.length === 0 ? (
                    <div className="mt-3 flex items-center gap-4 border-t border-wd-line py-5">
                      <span aria-hidden className="h-14 w-14 shrink-0 rounded-2xl bg-wd-accent-wash p-2.5">
                        <ClientArt kind="people" />
                      </span>
                      <p className="text-sm leading-relaxed text-wd-text">
                        {booking.status === "dp_paid" || booking.status === "full_paid" ? "Belum ada meeting. Jadwalkan technical meeting supaya detail hari-H jelas untuk kedua pihak." : "Technical meeting bisa dijadwalkan setelah client membayar DP."}
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-3 border-t border-wd-line">
                      {meetings.map((m) => (
                        <li key={m.id} className="border-b border-wd-line py-4">
                          <p className="text-sm font-semibold text-wd-accent-ink">{m.type === "technical_meeting" ? "Technical meeting" : "Konsultasi"}</p>
                          <p className="mt-0.5 font-semibold text-wd-ink">{formatWaktu(m.scheduled_at)}</p>
                          {m.meeting_link &&
                            (/^https?:\/\//.test(m.meeting_link) ? (
                              <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className={`mt-1 inline-flex min-h-11 max-w-full items-center break-all text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
                                Buka link meeting<span className="sr-only"> (tab baru)</span>
                              </a>
                            ) : (
                              <p className="mt-1 break-words text-sm text-wd-text">{m.meeting_link}</p>
                            ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <aside aria-labelledby="dana" className="lg:sticky lg:top-24">
                <h2 id="dana" className="wd-title text-[1.5rem] leading-tight">
                  Dana <em>booking</em>
                </h2>
                <p className="mt-4 text-sm text-wd-text">Harga disepakati</p>
                <p className="wd-display text-[2.4rem] leading-none tabular-nums">{formatRupiah(booking.agreed_price)}</p>
                <dl className="mt-5 border-t border-wd-line text-sm">
                  <div className="flex justify-between gap-4 border-b border-wd-line py-3.5">
                    <dt className="text-wd-text">DP (30%)</dt>
                    <dd className="font-semibold tabular-nums text-wd-ink">{formatRupiah(booking.dp_amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-wd-line py-3.5">
                    <dt className="text-wd-text">Pelunasan</dt>
                    <dd className="font-semibold tabular-nums text-wd-ink">{formatRupiah(Math.max(0, booking.agreed_price - booking.dp_amount))}</dd>
                  </div>
                  {booking.vendor_amount !== undefined && booking.vendor_amount !== booking.agreed_price && (
                    <div className="flex justify-between gap-4 border-b border-wd-line py-3.5">
                      <dt className="text-wd-text">Biaya layanan DuaCincin</dt>
                      <dd className="font-semibold tabular-nums text-wd-text">{formatRupiah(booking.agreed_price - booking.vendor_amount)}</dd>
                    </div>
                  )}
                  {booking.vendor_amount !== undefined && (
                    <div className="flex justify-between gap-4 border-b border-wd-line py-3.5">
                      <dt className="font-semibold text-wd-ink">Kamu terima</dt>
                      <dd className="font-bold tabular-nums text-wd-ink">{formatRupiah(booking.vendor_amount)}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-5 rounded-[22px] bg-wd-accent-wash p-4">
                  <p className="mb-2 text-xs font-semibold text-wd-text">Posisi dana sekarang</p>
                  <FundStatus status={booking.status} />
                  <p className="mt-3 text-xs leading-relaxed text-wd-text">Client membayar lewat DuaCincin. Dana ditahan Dana Aman, lalu bagianmu diteruskan ke rekeningmu setelah client menandai acara selesai.</p>
                </div>
              </aside>
            </div>

            {/* Primary action: floats above the phone tab bar, and at the bottom of the window on desktop. */}
            {showBar && (
              <div className="sticky bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 mt-10 md:bottom-4">
                <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white px-4 py-3 shadow-wd-pop ring-1 ring-wd-line">
                  <div className="min-w-0">
                    <p className="text-xs text-wd-muted">{booking.status === "completed" ? "Dana bersih" : booking.status === "requested" ? "Kamu terima" : "Technical meeting"}</p>
                    <p className="truncate font-bold tabular-nums text-wd-ink">
                      {booking.status === "completed" || booking.status === "requested" ? formatRupiah(booking.vendor_amount ?? booking.agreed_price) : "Belum dijadwalkan"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {booking.status === "requested" && (
                      <>
                        <button type="button" onClick={() => setDeclineOpen(true)} disabled={busy !== null} className={`${wdButton({ variant: "outline", size: "md" })} ${FOCUS}`}>
                          Tolak
                        </button>
                        <button type="button" onClick={handleConfirm} disabled={busy !== null} aria-busy={busy === "confirm"} className={`${wdButton({ variant: "gold", size: "md" })} ${FOCUS}`}>
                          {busy === "confirm" ? "Menerima..." : "Terima booking"}
                        </button>
                      </>
                    )}
                    {canSchedule && (
                      <button type="button" onClick={() => setSheetOpen(true)} className={`${wdButton({ variant: "gold", size: "md" })} ${FOCUS}`}>
                        Jadwalkan meeting
                      </button>
                    )}
                    {booking.status === "completed" && (
                      <Link href="/vendor/payouts" className={`${wdButton({ variant: "ink", size: "md" })} ${FOCUS}`}>
                        Lihat pencairan
                      </Link>
                    )}
                  </div>
                </div>
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
          </div>
        )}
      </div>
    </VendorShell>
  );
}
