"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  apiPost,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  formatRupiah,
  type Booking,
  type BudgetPlan,
  type Conversation,
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
  const router = useRouter();
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    apiGet<BudgetPlan>("/api/v1/budget-plan/me")
      .then(setBudget)
      .catch(() => {});
    apiGet<PlannerTask[]>("/api/v1/wedding-planner/tasks")
      .then((d) => setTasks(d ?? []))
      .catch(() => {});
    apiGet<Booking[]>("/api/v1/bookings")
      .then((d) => setBookings(d ?? []))
      .catch(() => {});
  }, []);

  async function handleStartConsultation() {
    const conv = await apiPost<Conversation>("/api/v1/conversations/consultation", {});
    router.push(`/client/messages/${conv.id}`);
  }

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

      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-heading text-lg font-bold text-dc-navy">Ringkasan Persiapan</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Budget snapshot */}
          <Card className="p-5">
            <p className="text-xs font-semibold tracking-wide text-dc-black/50 uppercase">Budget Planner</p>
            {budget && budget.total_budget > 0 ? (
              <>
                <p className="font-heading mt-2 text-2xl font-extrabold text-dc-navy">{formatRupiah(budget.total_budget)}</p>
                {topCategory && (
                  <p className="mt-1 text-sm text-dc-black/60">
                    Alokasi terbesar: <span className="font-medium text-dc-navy">{categoryLabelFor(topCategory.category)}</span> (
                    {topCategory.percentage.toFixed(0)}%)
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-dc-black/60">Belum diatur. Susun alokasi budget pernikahanmu.</p>
            )}
            <Link href="/client/budget" className="mt-4 inline-block text-sm font-semibold text-dc-gold hover:text-dc-navy">
              {budget && budget.total_budget > 0 ? "Sesuaikan budget →" : "Atur sekarang →"}
            </Link>
          </Card>

          {/* Wedding Planner snapshot */}
          <Card className="p-5">
            <p className="text-xs font-semibold tracking-wide text-dc-black/50 uppercase">Wedding Planner</p>
            <p className="font-heading mt-2 text-2xl font-extrabold text-dc-navy">
              {doneCount}/{tasks.length} <span className="text-sm font-medium text-dc-black/50">tugas selesai</span>
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-dc-offwhite">
              <div className="h-full rounded-full bg-dc-gold transition-all duration-500" style={{ width: `${plannerPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-dc-black/60">
              {nextTask ? (
                <>
                  Berikutnya: <span className="font-medium text-dc-navy">{nextTask.title}</span>
                </>
              ) : tasks.length ? (
                "Semua tugas selesai."
              ) : (
                "Memuat checklist…"
              )}
            </p>
            <Link href="/client/wedding-planner" className="mt-4 inline-block text-sm font-semibold text-dc-gold hover:text-dc-navy">
              Lihat checklist →
            </Link>
          </Card>

          {/* Booking snapshot */}
          <Card className="p-5">
            <p className="text-xs font-semibold tracking-wide text-dc-black/50 uppercase">Booking</p>
            {nextBooking ? (
              <>
                <p className="font-heading mt-2 text-2xl font-extrabold text-dc-navy">{nextBooking.event_date}</p>
                <div className="mt-1">
                  <Badge tone={BOOKING_STATUS_TONE[nextBooking.status]}>{BOOKING_STATUS_LABEL[nextBooking.status]}</Badge>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-dc-black/60">
                {bookings.length ? "Belum ada booking aktif." : "Belum ada booking. Cari vendor untuk mulai."}
              </p>
            )}
            <Link href="/client/bookings" className="mt-4 inline-block text-sm font-semibold text-dc-gold hover:text-dc-navy">
              Lihat semua booking →
            </Link>
          </Card>
        </div>

        <h2 className="font-heading mt-10 text-lg font-bold text-dc-navy">Aksi Cepat</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/inspirasi" className="group">
            <Card className="flex h-full items-center gap-4 p-5 transition duration-300 hover:-translate-y-1 hover:border-dc-gold/40 hover:shadow-lg hover:shadow-dc-navy/10">
              <div className="transition duration-300 group-hover:scale-110">
                <FeatureIcon>
                  <path d="M3 16l4-5.5 3 3.5 2-2.5L18 16M2 4h17v14H2Z" />
                </FeatureIcon>
              </div>
              <div>
                <h3 className="font-heading font-bold text-dc-navy">Inspirasi</h3>
                <p className="mt-0.5 text-sm text-dc-black/60">Galeri foto pernikahan asli Indonesia.</p>
              </div>
            </Card>
          </Link>

          <button onClick={handleStartConsultation} className="group text-left">
            <Card className="flex h-full items-center gap-4 border-dc-gold/30 bg-dc-gold/5 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-dc-gold/10">
              <div className="transition duration-300 group-hover:scale-110">
                <FeatureIcon>
                  <path d="M12 3a8 8 0 0 0-6.9 12.1L4 21l6.2-1.1A8 8 0 1 0 12 3Z" />
                  <path d="M9 11h6M9 14h4" />
                </FeatureIcon>
              </div>
              <div>
                <h3 className="font-heading font-bold text-dc-navy">Chat Wedding Consultant</h3>
                <p className="mt-0.5 text-sm text-dc-black/60">Butuh rekomendasi vendor? Konsultasi gratis.</p>
              </div>
            </Card>
          </button>
        </div>
      </div>
    </Shell>
  );
}
