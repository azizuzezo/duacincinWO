"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { WithUser } from "@/components/WithUser";
import { apiGet, type CurrentUser, type DashboardStats } from "@/lib/api";

export default function AdminDashboardPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminDashboardContent user={user} />}
    </WithUser>
  );
}

function AdminDashboardContent({ user }: { user: CurrentUser }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    apiGet<DashboardStats>("/api/v1/admin/dashboard").then(setStats).catch(() => {});
  }, []);

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <DashboardBanner title="Dashboard Admin" subtitle="Pantau vendor, transaksi, dan sengketa dalam satu tempat." />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Vendor Aktif"
            value={stats?.active_vendors}
            href="/internal/admin/vendors/approved"
            action="Kelola komisi →"
            delay={0}
          />
          <StatCard
            label="Transaksi Berjalan"
            value={stats?.ongoing_transactions}
            href="/internal/admin/disbursements"
            action="Lihat pencairan →"
            delay={60}
          />
          <StatCard
            label="Sengketa Terbuka"
            value={stats?.open_disputes}
            href="/internal/admin/disputes"
            action="Tinjau sengketa →"
            highlight={!!stats && stats.open_disputes > 0}
            delay={120}
          />
        </div>
      </div>
    </Shell>
  );
}

function StatCard({
  label,
  value,
  href,
  action,
  highlight,
  delay = 0,
}: {
  label: string;
  value?: number;
  href: string;
  action: string;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className={`animate-fade-up p-5 text-center shadow-lg shadow-dc-navy/10 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl ${highlight ? "border-dc-gold bg-dc-gold/10" : ""}`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <p className="font-heading text-3xl font-extrabold text-dc-navy">{value ?? "-"}</p>
        <p className="mt-1 text-sm text-dc-black/60">{label}</p>
        <p className="mt-3 text-xs font-semibold text-dc-gold group-hover:text-dc-navy">{action}</p>
      </Card>
    </Link>
  );
}
