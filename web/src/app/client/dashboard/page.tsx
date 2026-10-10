"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EYEBROW, ErrorState, FOCUS, H2, LINK, Skeleton } from "@/app/client/_ui";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
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
import { categoryLabelFor } from "@/lib/budget";

export default function ClientDashboardPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientDashboardContent user={user} />}
    </WithUser>
  );
}

function ClientDashboardContent({ user }: { user: CurrentUser }) {
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pending, setPending] = useState(3);
  const [failed, setFailed] = useState(false);

  function load() {
    setPending(3);
    setFailed(false);
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
      .catch(() => done()); // no plan yet is a normal state, not an error
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

  const topCategory = budget?.categories.slice().sort((a, b) => b.percentage - a.percentage)[0];

  const activeBookings = bookings.filter((b) => b.status !== "cancelled" && b.status !== "completed");
  const nextBooking = activeBookings
    .slice()
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <DashboardBanner
        title={`Halo, ${user.full_name || user.email}`}
        subtitle="Ringkasan persiapan pernikahanmu, semua dalam satu tempat."
        image="/hero/adat/melayu.webp"
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {failed && !loading && (
          <div className="mb-6">
            <ErrorState message="Sebagian ringkasan gagal dimuat." onRetry={load} />
          </div>
        )}

        <h2 className={H2}>Ringkasan Persiapan</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Budget snapshot */}
          <Card className="flex flex-col p-5">
            <p className={EYEBROW}>Budget Planner</p>
            {loading ? (
              <Skeleton className="mt-3 h-9 w-2/3" />
            ) : budget && budget.total_budget > 0 ? (
              <>
                <p className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight text-dc-ink">{formatRupiah(budget.total_budget)}</p>
                {topCategory && (
                  <p className="mt-1 text-sm text-dc-black/70">
                    Alokasi terbesar: <span className="font-medium text-dc-ink">{categoryLabelFor(topCategory.category)}</span> (
                    {topCategory.percentage.toFixed(0)}%)
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-dc-black/70">Belum diatur. Susun alokasi budget pernikahanmu.</p>
            )}
            <Link href="/client/budget" className={`mt-auto pt-3 ${LINK}`}>
              {budget && budget.total_budget > 0 ? "Sesuaikan budget" : "Atur sekarang"}
            </Link>
          </Card>

          {/* Wedding Planner snapshot */}
          <Card className="flex flex-col p-5">
            <p className={EYEBROW}>Wedding Planner</p>
            {loading ? (
              <Skeleton className="mt-3 h-9 w-2/3" />
            ) : (
              <>
                <p className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight text-dc-ink">
                  {doneCount}/{tasks.length} <span className="text-sm font-medium tracking-normal text-dc-black/70">tugas selesai</span>
                </p>
                <div
                  role="progressbar"
                  aria-label="Progres checklist"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={plannerPct}
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-dc-ink/10"
                >
                  <div className="h-full bg-dc-clay transition-[width] duration-150" style={{ width: `${plannerPct}%` }} />
                </div>
                <p className="mt-2 text-sm text-dc-black/70">
                  {nextTask ? (
                    <>
                      Berikutnya: <span className="font-medium text-dc-ink">{nextTask.title}</span>
                    </>
                  ) : tasks.length ? (
                    "Semua tugas selesai."
                  ) : (
                    "Belum ada tugas di checklist."
                  )}
                </p>
              </>
            )}
            <Link href="/client/wedding-planner" className={`mt-auto pt-3 ${LINK}`}>
              Lihat checklist
            </Link>
          </Card>

          {/* Booking snapshot */}
          <Card className="flex flex-col p-5">
            <p className={EYEBROW}>Booking</p>
            {loading ? (
              <Skeleton className="mt-3 h-9 w-2/3" />
            ) : nextBooking ? (
              <>
                <p className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight text-dc-ink">{nextBooking.event_date}</p>
                <div className="mt-2">
                  <Badge tone={BOOKING_STATUS_TONE[nextBooking.status]}>{BOOKING_STATUS_LABEL[nextBooking.status]}</Badge>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-dc-black/70">
                {bookings.length ? "Belum ada booking aktif." : "Belum ada booking. Cari vendor untuk mulai."}
              </p>
            )}
            <Link href="/client/bookings" className={`mt-auto pt-3 ${LINK}`}>
              Lihat semua booking
            </Link>
          </Card>
        </div>

        <h2 className={`${H2} mt-10`}>Aksi Cepat</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/inspirasi" className={`group block rounded-lg ${FOCUS}`}>
            <Card className="flex h-full items-center gap-4 p-5 transition-colors group-hover:border-dc-ink/30">
              <FeatureIcon>
                <path d="M3 16l4-5.5 3 3.5 2-2.5L18 16M2 4h17v14H2Z" />
              </FeatureIcon>
              <div>
                <h3 className="font-heading text-xl text-dc-ink">Inspirasi</h3>
                <p className="mt-0.5 text-sm text-dc-black/70">Galeri foto pernikahan asli Indonesia.</p>
              </div>
            </Card>
          </Link>

          <Link href="/client/consultation" className={`group block rounded-lg ${FOCUS}`}>
            <Card className="flex h-full items-center gap-4 p-5 transition-colors group-hover:border-dc-ink/30">
              <FeatureIcon>
                <path d="M12 3a8 8 0 0 0-6.9 12.1L4 21l6.2-1.1A8 8 0 1 0 12 3Z" />
                <path d="M9 11h6M9 14h4" />
              </FeatureIcon>
              <div>
                <h3 className="font-heading text-xl text-dc-ink">Konsultasi Wedding Consultant</h3>
                <p className="mt-0.5 text-sm text-dc-black/70">Jadwalkan sesi atau chat langsung, gratis.</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
