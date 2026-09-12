"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { BarChart } from "@/components/ui/BarChart";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then(setProfile)
      .catch(() => setProfile(null));
    apiGet<Booking[]>("/api/v1/bookings")
      .then((d) => setBookings(d ?? []))
      .catch(() => {});
    apiGet<Payout[]>("/api/v1/vendor/payouts")
      .then((d) => setPayouts(d ?? []))
      .catch(() => {});
  }, []);

  if (profile === undefined) return <p className="p-10 text-center text-dc-black/60">Memuat…</p>;

  if (profile === null) {
    return (
      <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
        <div className="mx-auto max-w-2xl px-4 py-10">
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

  const activeBookings = bookings.filter((b) => b.status !== "cancelled" && b.status !== "completed");
  const pendingPayout = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.net_amount, 0);

  const statusCounts = Object.entries(
    bookings.reduce<Record<string, number>>((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, value]) => ({ label: BOOKING_STATUS_LABEL[status as Booking["status"]] ?? status, value }));

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <DashboardBanner
        title={profile.business_name}
        subtitle="Ringkasan performa bisnis usahamu di DuaCincin."
        action={<Badge tone="gold">{profile.review_count > 0 ? `★ ${profile.average_rating.toFixed(1)} (${profile.review_count})` : "Belum ada rating"}</Badge>}
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Rating" value={profile.review_count > 0 ? profile.average_rating.toFixed(1) : "-"} trend={`${profile.review_count} ulasan`} density="structured" accent="gold" />
          <StatTile label="Booking Aktif" value={activeBookings.length} density="structured" accent="rose" />
          <StatTile label="Portofolio" value={profile.portfolio?.length ?? 0} density="structured" accent="navy" />
          <StatTile
            label="Estimasi Pencairan"
            value={formatRupiah(pendingPayout)}
            trend="menunggu dicairkan Admin"
            density="structured"
            accent="gold"
          />
        </div>

        {statusCounts.length > 0 && (
          <div className="mt-8 rounded-2xl border-l-4 border-dc-navy bg-dc-white p-5 shadow-md shadow-dc-navy/[0.06]">
            <h2 className="font-heading mb-4 font-bold text-dc-navy">Booking per Status</h2>
            <BarChart data={statusCounts} />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/vendor/payouts" className="rounded-2xl bg-dc-white px-5 py-4 shadow-md shadow-dc-navy/[0.06] transition hover:shadow-lg">
            <p className="font-heading font-bold text-dc-navy">Pencairan</p>
            <p className="mt-1 text-sm text-dc-black/60">Lihat riwayat dan status pencairan dana →</p>
          </Link>
          <Link href="/vendor/bookings" className="rounded-2xl bg-dc-white px-5 py-4 shadow-md shadow-dc-navy/[0.06] transition hover:shadow-lg">
            <p className="font-heading font-bold text-dc-navy">Booking</p>
            <p className="mt-1 text-sm text-dc-black/60">Kelola booking yang masuk →</p>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
