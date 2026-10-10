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
import { useAdminQueues, type AdminQueues } from "@/lib/useAdminQueues";
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

// Ordered by how costly waiting is: money in dispute first, then payouts
// vendors are waiting for, then onboarding, then housekeeping.
const QUEUES: { key: keyof AdminQueues; title: string; body: string; href: string; cta: string }[] = [
  { key: "disputes", title: "Sengketa terbuka", body: "Pelanggaran dan sengketa transaksi menunggu keputusan sanksi.", href: "/internal/admin/disputes", cta: "Tinjau sengketa" },
  { key: "disbursements", title: "Pencairan menunggu", body: "Acara sudah selesai. Dana vendor menunggu ditandai dicairkan.", href: "/internal/admin/disbursements", cta: "Proses pencairan" },
  { key: "vendors", title: "Vendor menunggu verifikasi", body: "Dokumen legalitas perlu ditinjau sebelum vendor tampil di direktori.", href: "/internal/admin/vendors", cta: "Verifikasi vendor" },
  { key: "nameChanges", title: "Pengajuan ganti nama", body: "Vendor meminta perubahan nama usaha dan butuh persetujuan.", href: "/internal/admin/vendor-name-changes", cta: "Proses pengajuan" },
];

function AdminDashboardContent({ user }: { user: CurrentUser }) {
  const { queues, loading: queuesLoading, failed: queuesFailed, reload: reloadQueues } = useAdminQueues(true);
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
      <DashboardBanner title="Antrian kerja" subtitle="Apa yang menunggu tindakanmu, diurutkan dari yang paling mendesak." />

      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <section aria-labelledby="antrian-title" className="relative -mt-10 mb-10 overflow-hidden rounded-lg border border-dc-ink/10 bg-dc-white sm:-mt-12">
          <h2 id="antrian-title" className="sr-only">
            Antrian kerja
          </h2>
          {queuesFailed && !queuesLoading && (
            <div className="p-4">
              <ErrorBanner message="Jumlah antrian gagal dimuat." onRetry={reloadQueues} />
            </div>
          )}
          {queuesLoading && !queues ? (
            <div className="p-4">
              <RowsSkeleton rows={4} />
            </div>
          ) : queues && QUEUES.every((q) => queues[q.key] === 0) ? (
            <p className="px-6 py-10 text-center text-dc-black/70">Semua antrian kosong. Tidak ada yang menunggu tindakanmu.</p>
          ) : (
            queues && (
              <ul className="divide-y divide-dc-ink/10">
                {QUEUES.map((q) => {
                  const n = queues[q.key];
                  return (
                    <li key={q.key}>
                      <Link
                        href={q.href}
                        className="flex min-h-16 flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-dc-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dc-clay/50 sm:px-6"
                      >
                        <span className={`w-12 shrink-0 font-sans text-3xl font-semibold tabular-nums ${n > 0 ? "text-dc-clay" : "text-dc-ink/60"}`}>{n}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-heading text-xl text-dc-ink">{q.title}</span>
                          <span className="block text-sm text-dc-black/70">{q.body}</span>
                        </span>
                        <span className={`w-full shrink-0 pl-[68px] text-sm font-semibold sm:w-auto sm:pl-0 ${n > 0 ? "text-dc-clay underline underline-offset-4" : "text-dc-black/60"}`}>{n > 0 ? q.cta : "Kosong"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </section>

        {failed && <ErrorBanner message="Sebagian data dashboard gagal dimuat." onRetry={retry} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatLink href="/internal/admin/vendors/approved">
            <StatTile density="structured" accent="ink" label="Vendor Aktif" value={stats?.active_vendors ?? "-"} trend="Kelola komisi" />
          </StatLink>
          <StatLink href="/internal/admin/disbursements">
            <StatTile density="structured" accent="gold" label="Transaksi Berjalan" value={stats?.ongoing_transactions ?? "-"} trend="Lihat pencairan" />
          </StatLink>
          <StatLink href="/internal/admin/disputes">
            <StatTile
              density="structured"
              accent={stats && stats.open_disputes > 0 ? "clay" : "ink"}
              label="Sengketa Terbuka"
              value={stats?.open_disputes ?? "-"}
              trend="Tinjau sengketa"
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
