"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { BarChart } from "@/components/ui/BarChart";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  BOOKING_STATUS_LABEL,
  formatRupiah,
  type Booking,
  type CurrentUser,
  type Payout,
  type VendorProfile,
} from "@/lib/api";

export default function VendorDashboardPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorDashboardContent user={user} />}
    </WithUser>
  );
}

function VendorDashboardContent({ user }: { user: CurrentUser }) {
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(
    undefined,
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [dataError, setDataError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then(setProfile)
      .catch(() => setProfile(null));
    apiGet<Booking[]>("/api/v1/bookings")
      .then((d) => setBookings(d ?? []))
      .catch(() => setDataError(true));
    apiGet<Payout[]>("/api/v1/vendor/payouts")
      .then((d) => setPayouts(d ?? []))
      .catch(() => setDataError(true));
  }, [reload]);

  if (profile === undefined) {
    return (
      <Shell
        user={user}
        navItems={VENDOR_NAV}
        loginPath="/login"
        eyebrow="Vendor"
      >
        <div
          className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
          aria-busy="true"
          aria-label="Memuat dashboard"
        >
          <div className="mb-10 h-14 w-72 animate-pulse rounded-md bg-dc-ink/5" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-dc-ink/5"
              />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  if (profile === null) {
    return (
      <Shell
        user={user}
        navItems={VENDOR_NAV}
        loginPath="/login"
        eyebrow="Vendor"
      >
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <EmptyState
            title="Lengkapi profil dulu"
            body="Isi profil usahamu supaya dashboard bisa menampilkan data booking, rating, dan pencairan."
            actionHref="/vendor/profile"
            actionLabel="Lengkapi Profil"
          />
        </div>
      </Shell>
    );
  }

  const activeBookings = bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "completed",
  );
  const pendingPayout = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.net_amount, 0);

  const statusCounts = Object.entries(
    bookings.reduce<Record<string, number>>((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, value]) => ({
    label: BOOKING_STATUS_LABEL[status as Booking["status"]] ?? status,
    value,
  }));

  return (
    <Shell
      user={user}
      navItems={VENDOR_NAV}
      loginPath="/login"
      eyebrow="Vendor"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          title={profile.business_name}
          subtitle="Ringkasan performa bisnis usahamu di DuaCincin."
          action={
            <Badge tone="gold">
              {profile.review_count > 0
                ? `★ ${profile.average_rating.toFixed(1)} (${profile.review_count})`
                : "Belum ada rating"}
            </Badge>
          }
        />

        {dataError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>Sebagian data gagal dimuat.</span>
            <button
              type="button"
              onClick={() => {
                setDataError(false);

                setReload((n) => n + 1);
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-red-300 px-4 font-semibold hover:bg-red-100"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Rating"
            value={
              profile.review_count > 0 ? profile.average_rating.toFixed(1) : "-"
            }
            trend={`${profile.review_count} ulasan`}
            density="structured"
            accent="gold"
          />
          <StatTile
            label="Booking Aktif"
            value={activeBookings.length}
            density="structured"
            accent="clay"
          />
          <StatTile
            label="Portofolio"
            value={profile.portfolio?.length ?? 0}
            density="structured"
            accent="ink"
          />
          <StatTile
            label="Estimasi Pencairan"
            value={formatRupiah(pendingPayout)}
            trend="menunggu dicairkan Admin"
            density="structured"
            accent="gold"
          />
        </div>

        {statusCounts.length > 0 && (
          <Card className="mt-6 p-5">
            <h2 className="font-heading mb-4 text-2xl text-dc-ink">
              Booking per status
            </h2>
            <BarChart data={statusCounts} />
          </Card>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/vendor/payouts"
            className="block min-h-11 rounded-lg border border-dc-ink/10 bg-dc-white px-5 py-4 transition-colors hover:border-dc-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            <p className="font-heading text-xl text-dc-ink">Pencairan</p>
            <p className="mt-1 text-sm text-dc-black/70">
              Lihat riwayat dan status pencairan dana →
            </p>
          </Link>
          <Link
            href="/vendor/bookings"
            className="block min-h-11 rounded-lg border border-dc-ink/10 bg-dc-white px-5 py-4 transition-colors hover:border-dc-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            <p className="font-heading text-xl text-dc-ink">Booking</p>
            <p className="mt-1 text-sm text-dc-black/70">
              Kelola booking yang masuk →
            </p>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
