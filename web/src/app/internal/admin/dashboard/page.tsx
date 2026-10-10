"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { StatTile } from "@/components/ui/StatTile";
import { WithUser } from "@/components/WithUser";
import { apiGet, type AuditLogEntry, type CurrentUser, type DashboardStats } from "@/lib/api";
import { ErrorBanner, RowsSkeleton } from "../../_ui";

const ACTION_LABEL: Record<string, string> = {
  "vendor.approve": "Menyetujui vendor",
  "vendor.reject": "Menolak vendor",
  "vendor.set_commission": "Mengubah komisi vendor",
  "disbursement.mark_disbursed": "Menandai dana dicairkan",
  "dispute.resolve": "Menyelesaikan sengketa",
  "vendor_name_change.resolve": "Memproses ganti nama vendor",
};

export default function AdminDashboardPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminDashboardContent user={user} />}
    </WithUser>
  );
}

function AdminDashboardContent({ user }: { user: CurrentUser }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  function load() {
    apiGet<DashboardStats>("/api/v1/admin/dashboard")
      .then((s) => {
        setStats(s);
        setFailed(false);
      })
      .catch(() => setFailed(true));
    apiGet<AuditLogEntry[]>("/api/v1/admin/audit-log?limit=5")
      .then((d) => setRecentActivity(d ?? []))
      .catch(() => setFailed(true));
  }

  useEffect(() => {
    load();
  }, []);

  function retry() {
    setFailed(false);
    load();
  }

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <DashboardBanner title="Dashboard Admin" subtitle="Pantau vendor, transaksi, dan sengketa dalam satu tempat." />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {failed && <ErrorBanner message="Sebagian data dashboard gagal dimuat." onRetry={retry} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatLink href="/internal/admin/vendors/approved">
            <StatTile density="structured" accent="ink" label="Vendor Aktif" value={stats?.active_vendors ?? "-"} trend="Kelola komisi →" />
          </StatLink>
          <StatLink href="/internal/admin/disbursements">
            <StatTile density="structured" accent="gold" label="Transaksi Berjalan" value={stats?.ongoing_transactions ?? "-"} trend="Lihat pencairan →" />
          </StatLink>
          <StatLink href="/internal/admin/disputes">
            <StatTile
              density="structured"
              accent={stats && stats.open_disputes > 0 ? "clay" : "ink"}
              label="Sengketa Terbuka"
              value={stats?.open_disputes ?? "-"}
              trend="Tinjau sengketa →"
            />
          </StatLink>
        </div>

        <section className="mt-8" aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="recent-title" className="font-heading text-2xl text-dc-ink">
              Aktivitas Terbaru
            </h2>
            <Link
              href="/internal/admin/audit-log"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-clay/50"
            >
              Lihat semua →
            </Link>
          </div>
          {recentActivity === null ? (
            failed ? null : <RowsSkeleton rows={3} />
          ) : recentActivity.length === 0 ? (
            <Card className="px-4 py-6 text-sm text-dc-black/70">Belum ada aktivitas tercatat.</Card>
          ) : (
            <Card>
              <ul>
                {recentActivity.map((e, i) => (
                  <li
                    key={e.id}
                    className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm ${i > 0 ? "border-t border-dc-ink/10" : ""}`}
                  >
                    <span className="font-medium text-dc-ink">{ACTION_LABEL[e.action] ?? e.action}</span>
                    <span className="text-xs tabular-nums text-dc-black/60">{new Date(e.created_at).toLocaleString("id-ID")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </Shell>
  );
}

function StatLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-lg transition-colors hover:[&>div]:border-dc-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-clay/50"
    >
      {children}
    </Link>
  );
}
