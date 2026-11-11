"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GrowBar, ProgressRing } from "@/app/client/_motion";
import { CountUp, FadeIn } from "@/components/ui/Motion";
import { daysUntil, ErrorState, FOCUS, firstName, formatTanggal, H2, LINK, relativeDays, Skeleton } from "@/app/client/_ui";
import { InvitationCard } from "@/components/invitation";
import { WORLDS } from "@/components/landing/scenes";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { FundStatus } from "@/components/ui/FundStatus";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  formatRupiah,
  type Booking,
  type BudgetPlan,
  type CurrentUser,
  type PlannerTask,
} from "@/lib/api";

type NextStep = { title: string; body: string; cta: string; href: string };

/** One recommended action, derived from the soonest active booking (PRD §8.11
 * order), else from whether a budget exists. */
function nextStep(booking: Booking | undefined, budget: BudgetPlan | null, hasAnyBooking: boolean): NextStep {
  if (booking) {
    const href = `/client/bookings/${booking.id}`;
    switch (booking.status) {
      case "requested":
        return { title: "Menunggu konfirmasi vendor", body: "Vendor sedang meninjau pengajuanmu. Kamu akan diberi tahu begitu dikonfirmasi.", cta: "Lihat booking", href };
      case "confirmed":
        return { title: "Bayar DP untuk mengunci tanggal", body: "Vendor sudah mengonfirmasi. DP ditahan escrow DuaCincin dan belum diteruskan ke vendor.", cta: "Bayar DP", href };
      case "dp_paid":
        return { title: "Lunasi sisa pembayaran", body: "Jadwalkan meeting dengan konsultan bila perlu, lalu lunasi pembayaran sebelum hari-H.", cta: "Buka booking", href };
      case "full_paid":
        return { title: "Siapkan technical meeting", body: "Sepakati rundown, denah, dan jadwal kru bersama vendor sebelum hari-H.", cta: "Atur meeting", href };
      default:
        return { title: "Lihat booking-mu", body: "Cek status terbaru booking yang sedang berjalan.", cta: "Buka booking", href };
    }
  }
  if (!budget || budget.total_budget <= 0) {
    return { title: "Mulai dari anggaran", body: "Masukkan total budget dan lihat alokasinya per kategori. Kamu bisa menyesuaikannya kapan saja.", cta: "Atur budget", href: "/client/budget" };
  }
  return {
    title: hasAnyBooking ? "Cari vendor berikutnya" : "Cari vendor pertamamu",
    body: "Bandingkan portofolio dan harga mulai dari, lalu diskusi lewat chat di dalam DuaCincin.",
    cta: "Cari vendor",
    href: "/vendors",
  };
}

// The header painting: bright Priangan rice fields, a warm Indonesian scene
// instead of the old dark reception photo. Credit is shown under it.
const SCENE = WORLDS.sunda;

export default function ClientDashboardPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientDashboardContent user={user} />}
    </WithUser>
  );
}

function ClientDashboardContent({ user }: { user: CurrentUser }) {
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [budgetFailed, setBudgetFailed] = useState(false);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pending, setPending] = useState(3);
  const [failed, setFailed] = useState(false);

  function load() {
    setPending(3);
    setFailed(false);
    setBudgetFailed(false);
    const done = () => setPending((n) => n - 1);
    const fail = () => {
      setFailed(true);
      done();
    };
    apiGet<BudgetPlan>("/api/v1/budget-plan/me")
      .then((d) => {
        setBudget(d);
        done();
      })
      .catch(() => {
        // Not a page-level error: the rest of the summary still works.
        setBudgetFailed(true);
        done();
      });
    apiGet<PlannerTask[]>("/api/v1/wedding-planner/tasks")
      .then((d) => {
        setTasks(d ?? []);
        done();
      })
      .catch(fail);
    apiGet<Booking[]>("/api/v1/bookings")
      .then((d) => {
        setBookings(d ?? []);
        done();
      })
      .catch(fail);
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const loading = pending > 0;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const plannerPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const nextTask = tasks.find((t) => t.status !== "done");

  const activeBookings = bookings
    .filter((b) => b.status !== "cancelled" && b.status !== "completed")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const nextBooking = activeBookings[0];
  // Same rule as the server's "spent by category": every booking except cancelled ones.
  const committed = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.agreed_price, 0);

  const next = nextStep(nextBooking, budget, bookings.length > 0);
  const days = daysUntil(nextBooking?.event_date);

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      {/* Bright header: greeting, the nearest real date, one painting. */}
      <header className="relative overflow-hidden border-b border-dc-line bg-dc-ivory">
        <Ornament />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] md:items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:pb-14">
          <div className="min-w-0 animate-fade-up">
            <p className="dc-eyebrow mb-3">Persiapan pernikahan</p>
            <h1 className="break-words font-heading text-[2.6rem] leading-[1.02] text-dc-ink sm:text-6xl">
              Halo, <span className="dc-em">{firstName(user.full_name, "kamu")}</span>
            </h1>

            {loading ? (
              <div role="status" aria-label="Memuat jadwal" className="mt-6 flex flex-col gap-3">
                <Skeleton className="h-16 w-56" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
            ) : nextBooking && days !== null && days >= 0 ? (
              <div className="mt-6">
                <div className="flex items-end gap-4">
                  {days > 1 ? (
                    <>
                      <p className="font-heading text-[4.5rem] leading-[0.85] text-dc-clay [font-variant-numeric:lining-nums_tabular-nums] sm:text-[6rem]">
                        <CountUp value={days} />
                      </p>
                      <div className="pb-1">
                        <p className="font-heading text-2xl leading-tight text-dc-ink sm:text-3xl">hari lagi</p>
                        <p className="text-sm text-dc-text-2">menuju jadwal vendor terdekat</p>
                      </div>
                    </>
                  ) : (
                    <p className="font-heading text-5xl leading-none text-dc-clay">{relativeDays(days)}</p>
                  )}
                </div>
                <p className="mt-5 flex max-w-xl items-start gap-2 text-[0.95rem] text-dc-text-2">
                  <CalendarIcon />
                  <span>
                    <span className="font-semibold text-dc-ink">{formatTanggal(nextBooking.event_date, { weekday: true })}</span>
                    <span className="text-dc-text-3"> · </span>
                    {nextBooking.package_description}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-dc-text-2">
                Anggaran, vendor, checklist, dan tamu pernikahanmu ada di sini. Mulai dari langkah di bawah.
              </p>
            )}
          </div>

          <figure className="relative mx-auto hidden w-full max-w-[360px] md:block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-2xl border border-dc-line shadow-lift">
              <Image src={`${SCENE.bg}-720.webp`} alt="Lukisan sawah dan gunung di tanah Priangan" fill sizes="360px" priority className="object-cover" />
              <div aria-hidden className="pointer-events-none absolute inset-2 rounded-t-full rounded-b-xl border border-dc-white/70" />
            </div>
            {!loading && tasks.length > 0 && (
              <div className="absolute -left-10 bottom-14 flex items-center gap-3 rounded-xl border border-dc-line bg-dc-white/95 py-3 pl-3 pr-5 shadow-float lg:-left-16">
                <ProgressRing pct={plannerPct} size={56} />
                <p className="text-sm leading-snug text-dc-text-2">
                  <span className="block font-semibold text-dc-ink">
                    {doneCount} dari {tasks.length}
                  </span>
                  tugas checklist selesai
                </p>
              </div>
            )}
            <figcaption className="mt-3 text-right text-xs leading-relaxed text-dc-text-2">
              {SCENE.credit.kind}:{" "}
              <a href={SCENE.credit.source} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 hover:text-dc-ink ${FOCUS}`}>
                {SCENE.credit.title}
              </a>
              , {SCENE.credit.author} ({SCENE.credit.license})
            </figcaption>
          </figure>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        {/* The one primary action: what to do next, and where the money is. */}
        <section
          aria-labelledby="langkah-berikutnya"
          className="relative -mt-6 overflow-hidden rounded-2xl border border-dc-line bg-dc-white shadow-lift animate-fade-up [animation-delay:80ms]"
        >
          {loading ? (
            <div role="status" aria-label="Memuat langkah berikutnya" className="p-6 sm:p-8">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-3 h-9 w-3/4" />
              <Skeleton className="mt-3 h-4 w-full max-w-md" />
              <Skeleton className="mt-6 h-12 w-40 rounded-full" />
            </div>
          ) : (
            <div className={nextBooking ? "grid lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
              <div className="p-6 sm:p-8">
                <p className="text-sm font-semibold text-dc-clay">Langkah berikutnya</p>
                <h2 id="langkah-berikutnya" className="mt-1.5 font-heading text-[2rem] leading-[1.08] text-dc-ink sm:text-[2.6rem]">
                  {next.title}
                </h2>
                <p className="mt-3 max-w-xl leading-relaxed text-dc-text-2">{next.body}</p>
                <ButtonLink href={next.href} variant="gold" size="md" className="mt-6">
                  {next.cta}
                </ButtonLink>
              </div>
              {nextBooking && (
                <aside aria-label="Booking terkait" className="border-t border-dc-line bg-dc-cream/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
                  <p className="text-sm text-dc-text-3">Booking terkait</p>
                  <p className="mt-1 font-semibold leading-snug text-dc-ink">{nextBooking.package_description}</p>
                  <p className="mt-0.5 text-sm text-dc-text-2">{formatTanggal(nextBooking.event_date)}</p>
                  <dl className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-dc-text-3">Harga disepakati</dt>
                      <dd className="mt-0.5 font-semibold text-dc-ink tabular-nums">{formatRupiah(nextBooking.agreed_price)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-dc-text-3">DP</dt>
                      <dd className="mt-0.5 font-semibold text-dc-ink tabular-nums">{formatRupiah(nextBooking.dp_amount)}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 border-t border-dc-line-strong pt-4">
                    <FundStatus status={nextBooking.status} />
                  </div>
                </aside>
              )}
            </div>
          )}
        </section>

        {failed && !loading && (
          <div className="mt-6">
            <ErrorState message="Sebagian ringkasan belum termuat." onRetry={load} />
          </div>
        )}

        {/* Preparation summary: budget gets the wide card (it carries the most
            numbers), the checklist the narrow one, bookings a full-width list. */}
        <section aria-labelledby="ringkasan" className="mt-14">
          <h2 id="ringkasan" className={H2}>
            Ringkasan persiapan
          </h2>
          <p className="mt-1 text-sm text-dc-text-2">Angka diambil langsung dari anggaran, checklist, dan booking kalian.</p>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <BudgetSummary className="lg:col-span-7" loading={loading} budget={budget} failed={budgetFailed} committed={committed} />
            <ChecklistSummary className="lg:col-span-5" loading={loading} total={tasks.length} done={doneCount} pct={plannerPct} nextTask={nextTask} />
            <BookingSummary className="lg:col-span-12" loading={loading} failed={failed} bookings={activeBookings} />
          </div>
        </section>

        <section aria-labelledby="lainnya" className="mt-14">
          <h2 id="lainnya" className={H2}>
            Yang bisa kalian lakukan
          </h2>
          <FadeIn className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
            <InvitationCard className="lg:col-span-7" />
            <QuickActions className="lg:col-span-5" />
          </FadeIn>
        </section>
      </div>
    </Shell>
  );
}

function BudgetSummary({
  className,
  loading,
  budget,
  failed,
  committed,
}: {
  className: string;
  loading: boolean;
  budget: BudgetPlan | null;
  failed: boolean;
  committed: number;
}) {
  const total = budget?.total_budget ?? 0;
  const over = total > 0 && committed > total;
  const usedPct = total > 0 ? Math.min(100, Math.round((committed / total) * 100)) : 0;

  return (
    <Card className={`flex flex-col p-6 animate-fade-up [animation-delay:160ms] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-2xl text-dc-ink">Anggaran</h3>
        {!loading && total > 0 && (over ? <Badge tone="danger">Lewat anggaran</Badge> : <Badge tone="neutral">{usedPct}% disepakati</Badge>)}
      </div>

      {loading ? (
        <div role="status" aria-label="Memuat anggaran" className="mt-4 flex flex-col gap-3">
          <Skeleton className="h-11 w-2/3" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : failed ? (
        <p className="mt-3 text-sm text-dc-text-2">Anggaran belum termuat. Buka halaman anggaran untuk mencoba lagi.</p>
      ) : total > 0 ? (
        <>
          <p className="mt-3 text-sm text-dc-text-3">Total anggaran</p>
          <p className="font-heading text-[2.4rem] font-semibold leading-tight text-dc-ink [font-variant-numeric:lining-nums_tabular-nums] sm:text-[2.8rem]">
            <CountUp value={total} format={formatRupiah} />
          </p>
          <GrowBar pct={usedPct} tone={over ? "danger" : "gold"} label="Bagian anggaran yang sudah disepakati di booking" className="mt-4 h-2.5" />
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-2 text-sm text-dc-text-2">
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${over ? "bg-dc-danger" : "bg-dc-gold"}`} />
                Disepakati di booking
              </dt>
              <dd className="mt-0.5 text-lg font-semibold text-dc-ink tabular-nums">{formatRupiah(committed)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-dc-text-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-dc-line-strong bg-dc-cream" />
                {over ? "Lewat dari anggaran" : "Belum terpakai"}
              </dt>
              <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${over ? "text-dc-danger" : "text-dc-ink"}`}>{formatRupiah(Math.abs(total - committed))}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-dc-text-2">
          Belum diatur. Tulis total anggaran, DuaCincin membaginya ke tiap kategori vendor untukmu.
        </p>
      )}

      <Link href="/client/budget" className={`mt-auto self-start pt-4 ${LINK}`}>
        {total > 0 ? "Atur anggaran" : "Mulai atur anggaran"}
      </Link>
    </Card>
  );
}

function ChecklistSummary({
  className,
  loading,
  total,
  done,
  pct,
  nextTask,
}: {
  className: string;
  loading: boolean;
  total: number;
  done: number;
  pct: number;
  nextTask?: PlannerTask;
}) {
  return (
    <Card className={`flex flex-col p-6 animate-fade-up [animation-delay:240ms] ${className}`}>
      <h3 className="font-heading text-2xl text-dc-ink">Checklist</h3>
      {loading ? (
        <div role="status" aria-label="Memuat checklist" className="mt-4 flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : total > 0 ? (
        <>
          <div className="mt-4 flex items-center gap-4">
            <ProgressRing pct={pct} size={84} />
            <p className="text-dc-text-2">
              <span className="block text-lg font-semibold text-dc-ink">
                {done} dari {total} tugas
              </span>
              sudah selesai
            </p>
          </div>
          <div className="mt-5 rounded-lg bg-dc-cream/70 px-4 py-3">
            {nextTask ? (
              <>
                <p className="text-sm text-dc-text-3">Berikutnya</p>
                <p className="font-semibold leading-snug text-dc-ink">{nextTask.title}</p>
                <p className="mt-0.5 text-sm text-dc-text-2">
                  {nextTask.due_date ? `Tenggat ${formatTanggal(nextTask.due_date)}` : nextTask.timeframe}
                </p>
              </>
            ) : (
              <p className="font-semibold text-dc-success">Semua tugas selesai. Tinggal menikmati hari-H.</p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-dc-text-2">Checklist belum berisi tugas. Buka Wedding Planner untuk memulai.</p>
      )}
      <Link href="/client/wedding-planner" className={`mt-auto self-start pt-4 ${LINK}`}>
        Buka checklist
      </Link>
    </Card>
  );
}

function BookingSummary({ className, loading, failed, bookings }: { className: string; loading: boolean; failed: boolean; bookings: Booking[] }) {
  return (
    <Card className={`p-6 animate-fade-up [animation-delay:320ms] ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-heading text-2xl text-dc-ink">
          Booking aktif
          {!loading && bookings.length > 0 && <span className="ml-2 font-sans text-base font-semibold text-dc-text-3 tabular-nums">{bookings.length}</span>}
        </h3>
        <Link href="/client/bookings" className={LINK}>
          Semua booking
        </Link>
      </div>

      {loading ? (
        <div role="status" aria-label="Memuat booking" className="mt-4 flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : failed && bookings.length === 0 ? (
        <p className="mt-3 text-sm text-dc-text-2">Daftar booking belum termuat.</p>
      ) : bookings.length === 0 ? (
        <div className="mt-4 flex flex-col items-start gap-4 rounded-lg border border-dashed border-dc-line-strong px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm leading-relaxed text-dc-text-2">
            Belum ada booking yang berjalan. Pembayaran nanti ditahan escrow DuaCincin sampai acara selesai.
          </p>
          <ButtonLink href="/vendors" variant="primary" size="sm">
            Cari vendor
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-dc-line">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/client/bookings/${b.id}`}
                className={`group -mx-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-lg px-2 py-4 transition-colors hover:bg-dc-cream/60 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${FOCUS}`}
              >
                <DateBlock date={b.event_date} />
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-dc-ink group-hover:underline group-hover:underline-offset-4">{b.package_description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                  </div>
                </div>
                <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center">
                  <p className="font-semibold text-dc-ink tabular-nums">{formatRupiah(b.agreed_price)}</p>
                  <FundStatus status={b.status} compact />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const QUICK_ACTIONS: { href: string; title: string; body: string; icon: React.ReactNode }[] = [
  {
    href: "/vendors",
    title: "Cari vendor",
    body: "Bandingkan portofolio dan harga.",
    icon: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" />,
  },
  {
    href: "/client/wedding-planner/guests",
    title: "Daftar tamu & RSVP",
    body: "Catat tamu dan bagikan tautan RSVP.",
    icon: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6" />,
  },
  {
    href: "/client/consultation",
    title: "Tanya Wedding Consultant",
    body: "Jadwalkan sesi atau chat, gratis.",
    icon: (
      <>
        <path d="M12 3a8 8 0 0 0-6.9 12.1L4 21l6.2-1.1A8 8 0 1 0 12 3Z" />
        <path d="M9 11h6M9 14h4" />
      </>
    ),
  },
  {
    href: "/inspirasi",
    title: "Inspirasi",
    body: "Galeri foto pernikahan Indonesia.",
    icon: <path d="M3 16l4-5.5 3 3.5 2-2.5L18 16M2 4h17v14H2Z" />,
  },
];

function QuickActions({ className }: { className: string }) {
  return (
    <Card className={`p-2 ${className}`}>
      <ul className="divide-y divide-dc-line">
        {QUICK_ACTIONS.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className={`group flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-dc-cream/60 ${FOCUS}`}>
              <FeatureIcon>{a.icon}</FeatureIcon>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-dc-ink">{a.title}</span>
                <span className="block text-sm text-dc-text-2">{a.body}</span>
              </span>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-dc-text-3 transition-transform group-hover:translate-x-0.5">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Day number over short month, so a list of bookings scans by date. */
function DateBlock({ date }: { date: string }) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const valid = y && m && d;
  const month = valid ? new Date(y, m - 1, d).toLocaleDateString("id-ID", { month: "short" }) : "";
  return (
    <span aria-label={formatTanggal(date)} className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-dc-line bg-dc-ivory">
      <span aria-hidden className="font-heading text-[1.75rem] leading-none text-dc-ink [font-variant-numeric:lining-nums]">
        {valid ? d : "?"}
      </span>
      <span aria-hidden className="mt-0.5 text-xs font-medium text-dc-text-3">
        {month} {valid ? String(y).slice(2) : ""}
      </span>
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="mt-0.5 shrink-0 text-dc-clay">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

/** Two large hairline rings behind the header text: the brand motif, decorative only. */
function Ornament() {
  return (
    <svg aria-hidden viewBox="0 0 640 400" fill="none" className="pointer-events-none absolute -left-40 -top-24 h-[420px] w-[680px] text-dc-gold opacity-25">
      <circle cx="240" cy="200" r="170" stroke="currentColor" strokeWidth="1" />
      <circle cx="400" cy="200" r="170" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
