"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { VendorThumb } from "@/components/booking/BookingCard";
import { countdownLabel, formatJam, formatTanggal } from "@/components/booking/format";
import { useVendorLookup } from "@/components/booking/useVendorLookup";
import { BookingStepper } from "@/components/BookingStepper";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Textarea } from "@/components/ui/Field";
import { FundStatus } from "@/components/ui/FundStatus";
import { CountUp } from "@/components/ui/Motion";
import { Modal } from "@/components/ui/Modal";
import { Sheet } from "@/components/ui/Sheet";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { StarInput } from "@/components/ui/StarInput";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { EASE, useReducedMotion } from "@/lib/motion";
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

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

function meetingWhen(iso: string): string {
  return `${formatTanggal(iso, true)}, pukul ${formatJam(iso)}`;
}

function ClientBookingDetailContent({ id, user }: { id: string; user: CurrentUser }) {
  const { show } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devPending, setDevPending] = useState<"dp" | "full" | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      show(type === "dp" ? "DP tercatat dan ditahan escrow." : "Pelunasan tercatat dan ditahan escrow.", "success");
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
      setMeetingOpen(false);
      show("Jadwal technical meeting tersimpan.", "success");
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
      setConfirmOpen(false);
      show("Selamat! Acaramu selesai dan dana diteruskan ke vendor.", "success");
      load();
    } catch (err) {
      setConfirmOpen(false);
      setError(err instanceof ApiError ? err.message : "Gagal menyelesaikan booking.");
    } finally {
      setBusy(false);
    }
  }

  const vendors = useVendorLookup(booking ? [booking.vendor_id] : []);
  const vendor = booking ? vendors[booking.vendor_id] : undefined;
  const techMeetings = meetings.filter((m) => m.type === "technical_meeting");
  const hasTechnicalMeeting = techMeetings.length > 0;

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 md:pb-12">
        <Link
          href="/client/bookings"
          className={`-ml-2 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-dc-clay hover:bg-dc-cream ${FOCUS}`}
        >
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Semua booking
        </Link>

        {!booking ? (
          error ? (
            <ErrorState title="Booking tidak ditemukan" body="Mungkin tautannya salah, atau koneksimu sedang terputus." onRetry={load} />
          ) : (
            <SkeletonGroup label="Memuat booking" className="flex flex-col gap-6">
              <div className="flex gap-5">
                <span className="dc-skeleton block h-24 w-24 rounded-lg sm:h-32 sm:w-40" />
                <div className="flex flex-1 flex-col gap-3 pt-2">
                  <span className="dc-skeleton block h-3 w-28 rounded-full" />
                  <span className="dc-skeleton block h-9 w-2/3 rounded-full" />
                  <span className="dc-skeleton block h-3 w-1/2 rounded-full" />
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <span className="dc-skeleton block h-112 rounded-xl" />
                <span className="dc-skeleton block h-72 rounded-xl" />
              </div>
            </SkeletonGroup>
          )
        ) : (
          <div className="animate-fade-up">
            {/* Who and when: vendor photo first, then the date the whole booking is about. */}
            <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
              <VendorThumb vendor={vendor} className="h-28 w-full sm:h-36 sm:w-48" />
              <div className="min-w-0 flex-1">
                {vendor && (
                  <p className="text-sm font-medium text-dc-text-3">
                    {vendor.category}
                    {vendor.city ? ` · ${vendor.city}` : ""}
                  </p>
                )}
                <h1 className="mt-0.5 text-balance wrap-break-word font-heading text-[2.2rem] leading-[1.05] text-dc-ink sm:text-[2.75rem]">
                  {vendor?.name ?? booking.package_description ?? "Booking"}
                </h1>
                {vendor && booking.package_description && <p className="mt-1 wrap-break-word text-dc-text-2">{booking.package_description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-sm text-dc-text-2">
                    <span className="font-semibold text-dc-ink">{formatTanggal(booking.event_date, true)}</span>
                    {booking.status !== "completed" && booking.status !== "cancelled" && countdownLabel(booking.event_date) && (
                      <span className="text-dc-text-3"> · {countdownLabel(booking.event_date)}</span>
                    )}
                  </p>
                  <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
                </div>
                <Link
                  href={`/vendors/${booking.vendor_id}`}
                  className={`-ml-2 mt-1 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline ${FOCUS}`}
                >
                  Lihat profil vendor
                </Link>
              </div>
            </header>

            {error && (
              <p role="alert" className="mb-6 rounded-lg border border-dc-danger/25 bg-dc-danger/5 px-4 py-3 text-sm text-dc-danger">
                {error}
              </p>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
              <div className="flex min-w-0 flex-col gap-6">
                {booking.status === "completed" && <ReviewSection bookingId={id} vendorName={vendor?.name} />}

                <Card className="p-5 sm:p-7">
                  <h2 className="font-heading text-[1.75rem] leading-tight text-dc-ink">Perjalanan booking</h2>
                  <p className="mb-6 mt-1 text-sm text-dc-text-2">Siapa melakukan apa, dan di mana uangmu di setiap tahap.</p>
                  <BookingStepper status={booking.status} meetings={meetings} perspective="client" />
                </Card>

                {(booking.status === "dp_paid" || booking.status === "full_paid") && (
                  <Card className="p-5 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-heading text-[1.75rem] leading-tight text-dc-ink">Technical meeting</h2>
                        <p className="mt-1 max-w-md text-sm text-dc-text-2">
                          Pertemuan dengan vendor untuk menyepakati rundown, denah, dan jadwal kru. Wajib ada sebelum hari-H.
                        </p>
                      </div>
                      {!hasTechnicalMeeting && (
                        <Button variant="primary" size="sm" onClick={() => setMeetingOpen(true)}>
                          Jadwalkan
                        </Button>
                      )}
                    </div>
                    {hasTechnicalMeeting ? (
                      <ul className="mt-5 flex flex-col gap-3">
                        {techMeetings.map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-dc-cream px-4 py-3">
                            <p className="font-semibold text-dc-ink">{meetingWhen(m.scheduled_at)}</p>
                            {m.meeting_link && (
                              <a
                                href={m.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline ${FOCUS}`}
                              >
                                Buka link meeting
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 rounded-lg border border-dashed border-dc-line-strong px-4 py-3 text-sm text-dc-text-2">Belum dijadwalkan.</p>
                    )}
                  </Card>
                )}
              </div>

              <aside className="lg:sticky lg:top-8">
                <PaymentPanel
                  booking={booking}
                  busy={busy}
                  devPending={devPending}
                  hasTechnicalMeeting={hasTechnicalMeeting}
                  onPay={handlePay}
                  onSimulate={handleSimulate}
                  onSchedule={() => setMeetingOpen(true)}
                  onComplete={() => setConfirmOpen(true)}
                />
              </aside>
            </div>

            <MobileActionBar
              booking={booking}
              busy={busy}
              hasTechnicalMeeting={hasTechnicalMeeting}
              onPay={handlePay}
              onSchedule={() => setMeetingOpen(true)}
              onComplete={() => setConfirmOpen(true)}
            />

            <Sheet
              open={meetingOpen}
              onClose={() => setMeetingOpen(false)}
              title="Jadwalkan technical meeting"
              description="Vendor mendapat kabar begitu jadwal disimpan."
              footer={
                <Button type="submit" form="tm-form" variant="primary" block loading={busy}>
                  Simpan jadwal
                </Button>
              }
            >
              <form id="tm-form" onSubmit={handleScheduleMeeting} className="flex flex-col gap-5">
                <Input id="tm-date" label="Tanggal dan waktu" type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
                <Input
                  id="tm-link"
                  label="Link meeting"
                  optional
                  type="text"
                  placeholder="Tempel link Zoom atau Google Meet"
                  hint="Kosongkan bila bertemu langsung."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
                {error && (
                  <p role="alert" className="text-sm text-dc-danger">
                    {error}
                  </p>
                )}
              </form>
            </Sheet>

            <Modal
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              title="Acara sudah selesai?"
              description={`Setelah kamu konfirmasi, ${formatRupiah(booking.agreed_price)} diteruskan ke vendor dan tidak bisa ditarik kembali.`}
              size="sm"
            >
              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
                  Belum
                </Button>
                <Button variant="primary" size="sm" onClick={handleComplete} loading={busy}>
                  Ya, acara selesai
                </Button>
              </div>
            </Modal>
          </div>
        )}
      </div>
    </Shell>
  );
}

type PayProps = {
  booking: Booking;
  busy: boolean;
  hasTechnicalMeeting: boolean;
  onPay: (t: "dp" | "full") => void;
  onSchedule: () => void;
  onComplete: () => void;
};

/** Money at a glance: what the booking costs, what is paid, where it sits now,
 * and the one payment action of this stage. */
function PaymentPanel({
  booking: b,
  busy,
  devPending,
  hasTechnicalMeeting,
  onPay,
  onSimulate,
  onSchedule,
  onComplete,
}: PayProps & { devPending: "dp" | "full" | null; onSimulate: (t: "dp" | "full") => void }) {
  const rest = b.agreed_price - b.dp_amount;
  const dpPaid = b.status === "dp_paid" || b.status === "full_paid" || b.status === "completed";
  const fullPaid = b.status === "full_paid" || b.status === "completed";
  const held = b.status === "dp_paid" ? b.dp_amount : b.status === "full_paid" ? b.agreed_price : 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 className="font-heading text-[1.75rem] leading-tight text-dc-ink">Pembayaran</h2>
        <p className="mt-3 text-sm text-dc-text-2">Total harga</p>
        <p className="font-heading text-[2.4rem] leading-none lining-nums tabular-nums text-dc-ink">
          <CountUp value={b.agreed_price} format={formatRupiah} />
        </p>

        <dl className="mt-5 flex flex-col divide-y divide-dc-line border-y border-dc-line text-sm">
          <PayRow label="DP 30%" amount={b.dp_amount} paid={dpPaid} />
          <PayRow label="Pelunasan" amount={rest} paid={fullPaid} />
        </dl>

        <div className="mt-5 rounded-lg bg-dc-cream p-4">
          <p className="mb-2 text-xs font-semibold text-dc-text-2">Posisi dana sekarang</p>
          <FundStatus status={b.status} />
          {held > 0 && <p className="mt-2 text-sm font-semibold tabular-nums text-dc-ink">{formatRupiah(held)} ditahan DuaCincin</p>}
        </div>
      </div>

      <div className="hidden border-t border-dc-line bg-dc-white p-5 sm:p-6 md:block">
        <PrimaryAction booking={b} busy={busy} hasTechnicalMeeting={hasTechnicalMeeting} onPay={onPay} onSchedule={onSchedule} onComplete={onComplete} />
      </div>

      {devPending && (
        <div className="border-t border-dashed border-dc-line-strong p-5 sm:p-6">
          <p className="mb-2 text-xs text-dc-text-3">Mode uji: pembayaran tidak benar-benar ditagih.</p>
          <Button variant="ghost" size="sm" block onClick={() => onSimulate(devPending)} loading={busy}>
            {devPending === "dp" ? "Simulasikan Pembayaran DP Berhasil (Dev Mode)" : "Simulasikan Pelunasan Berhasil (Dev Mode)"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function PayRow({ label, amount, paid }: { label: string; amount: number; paid: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="text-dc-text-2">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        <span className="font-semibold tabular-nums text-dc-ink">{formatRupiah(amount)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paid ? "bg-dc-success/10 text-dc-success" : "bg-dc-cream text-dc-text-2"}`}>
          {paid ? "Dibayar" : "Belum"}
        </span>
      </dd>
    </div>
  );
}

/** The single next action for the couple at this stage, or a calm note when it is someone else's turn. */
function PrimaryAction({ booking: b, busy, hasTechnicalMeeting, onPay, onSchedule, onComplete, compact = false }: PayProps & { compact?: boolean }) {
  const rest = b.agreed_price - b.dp_amount;
  if (b.status === "confirmed")
    return (
      <Button variant="gold" block={!compact} onClick={() => onPay("dp")} loading={busy}>
        {compact ? "Bayar DP" : `Bayar DP ${formatRupiah(b.dp_amount)}`}
      </Button>
    );
  if (b.status === "dp_paid")
    return (
      <Button variant="gold" block={!compact} onClick={() => onPay("full")} loading={busy}>
        {compact ? "Bayar pelunasan" : `Bayar pelunasan ${formatRupiah(rest)}`}
      </Button>
    );
  if (b.status === "full_paid" && !hasTechnicalMeeting)
    return (
      <Button variant="primary" block={!compact} onClick={onSchedule}>
        {compact ? "Jadwalkan meeting" : "Jadwalkan technical meeting"}
      </Button>
    );
  if (b.status === "full_paid")
    return (
      <Button variant="primary" block={!compact} onClick={onComplete} loading={busy}>
        {compact ? "Acara selesai" : "Konfirmasi acara selesai"}
      </Button>
    );
  if (compact) return null;
  const note =
    b.status === "requested"
      ? "Menunggu vendor mengonfirmasi. Kamu akan diberi tahu begitu ada kabar."
      : b.status === "completed"
        ? "Semua tahap selesai. Terima kasih sudah memakai DuaCincin."
        : "Booking ini dibatalkan.";
  return <p className="text-sm leading-relaxed text-dc-text-2">{note}</p>;
}

/** Mobile: the stage's action stays reachable above the bottom tab bar. */
function MobileActionBar(props: PayProps) {
  const b = props.booking;
  // Keyboard focus must never land under the fixed bar (WCAG 2.4.11): pad the scroll area while it shows.
  useEffect(() => {
    if (!document.querySelector("[data-action-bar]")) return;
    const root = document.documentElement;
    const prev = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = "10rem";
    return () => {
      root.style.scrollPaddingBottom = prev;
    };
  }, [b.status]);
  const label =
    b.status === "confirmed" ? "DP 30%" : b.status === "dp_paid" ? "Sisa pelunasan" : b.status === "full_paid" ? "Ditahan escrow" : null;
  const amount = b.status === "confirmed" ? b.dp_amount : b.status === "dp_paid" ? b.agreed_price - b.dp_amount : b.agreed_price;
  if (!label) return null;
  return (
    <div data-action-bar className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-dc-line bg-dc-white/95 px-4 py-3 shadow-[0_-10px_30px_-18px_color-mix(in_srgb,var(--dc-ink)_35%,transparent)] backdrop-blur-sm md:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-dc-text-3">{label}</p>
          <p className="truncate font-bold tabular-nums text-dc-ink">{formatRupiah(amount)}</p>
        </div>
        <PrimaryAction {...props} compact />
      </div>
    </div>
  );
}

function ReviewSection({ bookingId, vendorName }: { bookingId: string; vendorName?: string }) {
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
      <Card tone="paper" className="p-5 sm:p-7">
        <h2 className="font-heading text-[1.75rem] leading-tight text-dc-ink">Ulasanmu sudah tercatat</h2>
        <p className="mt-1 text-sm text-dc-text-2">Terima kasih. Ulasanmu membantu pasangan lain memilih vendor.</p>
      </Card>
    );
  }

  return (
    <Card className="border-dc-gold/50 p-5 sm:p-7">
      <CelebrationMark />
      <h2 className="font-heading text-[1.9rem] leading-tight text-dc-ink">
        Bagaimana pengalamanmu dengan <span className="dc-em">{vendorName ?? "vendor ini"}</span>?
      </h2>
      <p className="mt-1 text-sm text-dc-text-2">Hanya pasangan yang bookingnya selesai lewat DuaCincin yang bisa menulis ulasan, jadi suaramu berarti.</p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <StarInput value={rating} onChange={setRating} label="Rating untuk vendor ini" />
        <Textarea
          label="Ceritakan pengalamanmu"
          optional
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Misalnya ketepatan waktu, hasil kerja, dan cara berkomunikasi"
        />
        {error && (
          <p role="alert" className="text-sm text-dc-danger">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" variant="gold" loading={saving}>
            Kirim ulasan
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Milestone moment: the two rings draw themselves in once when the booking is
 * finished, celebrating the wedding before asking for a review. Static under
 * reduced motion. */
function CelebrationMark() {
  const reduced = useReducedMotion();
  const ring = (cx: number, delay: number) => (
    <motion.circle
      cx={cx}
      cy="20"
      r="15"
      stroke="currentColor"
      strokeWidth="1.6"
      initial={reduced ? false : { pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    />
  );
  return (
    <p className="mb-3 flex items-center gap-3 text-sm font-semibold text-dc-clay">
      <svg aria-hidden viewBox="0 0 64 40" fill="none" className="h-8 w-12 text-dc-gold">
        {ring(24, 0.1)}
        {ring(40, 0.35)}
      </svg>
      Acara selesai. Selamat menempuh hidup baru!
    </p>
  );
}
