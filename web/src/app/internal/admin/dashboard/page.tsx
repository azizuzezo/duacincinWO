"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { CountUp, MotionItem, MotionList } from "@/components/ui/Motion";
import { WithUser } from "@/components/WithUser";
import { apiGet, type AuditLogEntry, type CurrentUser, type DashboardStats } from "@/lib/api";
import { useAdminQueues, type AdminQueues } from "@/lib/useAdminQueues";
import { ACTION_LABEL, auditDetail, ErrorBanner, relatif } from "../../_ui";

export default function AdminDashboardPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminDashboardContent user={user} />}
    </WithUser>
  );
}

// Ordered by how costly waiting is: money in dispute first, then payouts
// vendors are waiting for, then onboarding, then housekeeping.
const QUEUES: { key: keyof AdminQueues; title: string; why: string; href: string; cta: string; unit: string }[] = [
  {
    key: "disputes",
    title: "Sengketa terbuka",
    why: "Laporan pelanggaran menunggu keputusan sanksi. Vendor dan client menunggu kejelasan.",
    href: "/internal/admin/disputes",
    cta: "Tinjau sengketa",
    unit: "kasus",
  },
  {
    key: "disbursements",
    title: "Pencairan menunggu",
    why: "Acara sudah selesai. Dana vendor menunggu ditransfer dan ditandai dicairkan.",
    href: "/internal/admin/disbursements",
    cta: "Proses pencairan",
    unit: "booking",
  },
  {
    key: "vendors",
    title: "Vendor menunggu verifikasi",
    why: "Vendor baru belum tampil di direktori sampai kamu setujui.",
    href: "/internal/admin/vendors",
    cta: "Verifikasi vendor",
    unit: "vendor",
  },
  {
    key: "nameChanges",
    title: "Pengajuan ganti nama",
    why: "Vendor meminta nama usahanya diubah di halaman publik.",
    href: "/internal/admin/vendor-name-changes",
    cta: "Proses pengajuan",
    unit: "pengajuan",
  },
];

function sapaan(): string {
  const h = new Date().getHours();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

function AdminDashboardContent({ user }: { user: CurrentUser }) {
  const { queues, loading: queuesLoading, failed: queuesFailed, reload: reloadQueues } = useAdminQueues(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<AuditLogEntry[] | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const [recentFailed, setRecentFailed] = useState(false);
  const [greeting, setGreeting] = useState("");

  function load() {
    setStatsFailed(false);
    setRecentFailed(false);
    apiGet<DashboardStats>("/api/v1/admin/dashboard")
      .then(setStats)
      .catch(() => setStatsFailed(true));
    apiGet<AuditLogEntry[]>("/api/v1/admin/audit-log?limit=5")
      .then((d) => setRecent(d ?? []))
      .catch(() => setRecentFailed(true));
  }

  useEffect(() => {
    queueMicrotask(() => {
      setGreeting(sapaan());
      load();
    });
  }, []);

  const firstName = user.full_name?.split(" ")[0] ?? "";
  const open = queues ? QUEUES.filter((q) => queues[q.key] > 0) : [];
  const focus = open[0];
  const total = queues ? QUEUES.reduce((n, q) => n + queues[q.key], 0) : 0;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <DashboardBanner
        eyebrow={greeting && firstName ? `${greeting}, ${firstName}` : undefined}
        title={
          <>
            Antrian <span className="dc-em">kerja</span>
          </>
        }
        subtitle={
          queues
            ? total === 0
              ? "Tidak ada yang menunggu tindakanmu saat ini."
              : `${total} hal menunggu tindakanmu, diurutkan dari yang paling mendesak.`
            : "Apa yang menunggu tindakanmu, diurutkan dari yang paling mendesak."
        }
        action={
          focus ? (
            <ButtonLink href={focus.href} variant="gold" size="lg">
              {focus.cta}
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        {/* One list in fixed urgency order (money in dispute first). The first queue
            with work is the focal row: champagne wash, "Paling mendesak", and the banner CTA. */}
        <section aria-labelledby="antrian-title" className="relative -mt-10 overflow-hidden rounded-xl border border-dc-line bg-dc-white shadow-soft sm:-mt-12">
          <h2 id="antrian-title" className="sr-only">
            Antrian kerja
          </h2>
          {queuesFailed && !queues ? (
            <div className="p-2">
              <ErrorState compact title="Antrian belum bisa dimuat" onRetry={reloadQueues} />
            </div>
          ) : queuesLoading && !queues ? (
            <SkeletonGroup label="Memuat antrian kerja">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`flex items-center gap-5 px-5 py-5 sm:px-7 ${i > 0 ? "border-t border-dc-line" : ""}`}>
                  <Skeleton className="h-10 w-10" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </SkeletonGroup>
          ) : (
            queues && (
              <MotionList className="divide-y divide-dc-line">
                {QUEUES.map((q) => {
                  const n = queues[q.key];
                  const isFocus = focus?.key === q.key;
                  return (
                    <MotionItem key={q.key} className={`relative ${isFocus ? "bg-dc-gold-wash/60" : ""}`}>
                      <Link
                        href={q.href}
                        className="group grid min-h-20 grid-cols-[2.75rem_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-5 transition-colors hover:bg-dc-ivory active:bg-dc-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dc-gold sm:grid-cols-[4.5rem_1fr_auto] sm:px-7"
                      >
                        <span style={{ fontFamily: "var(--font-heading)" }} className={`font-semibold leading-none [font-variant-numeric:lining-nums_tabular-nums] ${isFocus ? "text-6xl text-dc-ink" : n > 0 ? "text-5xl text-dc-ink" : "text-5xl text-dc-text-3"}`}>
                          <CountUp value={n} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className={`font-heading text-2xl leading-tight ${n > 0 ? "text-dc-ink" : "text-dc-text-2"}`}>{q.title}</span>
                            {isFocus && <Badge tone="warning">Paling mendesak</Badge>}
                          </span>
                          <span className="mt-0.5 block text-sm leading-relaxed text-dc-text-2">{n > 0 ? q.why : "Tidak ada yang menunggu."}</span>
                        </span>
                        <span className={`hidden text-sm font-semibold sm:inline ${n > 0 ? "text-dc-clay group-hover:underline group-hover:underline-offset-4" : "text-dc-text-3"}`}>{n > 0 ? q.cta : "Kosong"}</span>
                      </Link>
                    </MotionItem>
                  );
                })}
              </MotionList>
            )
          )}
        </section>
        {queues && queuesFailed && (
          <p className="mt-3 text-sm text-dc-danger" role="alert">
            Angka antrian mungkin belum terbaru.{" "}
            <button type="button" onClick={reloadQueues} className="min-h-11 font-semibold underline underline-offset-4">
              Muat ulang
            </button>
          </p>
        )}

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section aria-labelledby="ringkasan-title" className="min-w-0">
            <div className="mb-4 flex min-h-11 items-end">
              <h2 id="ringkasan-title" className="font-heading text-3xl text-dc-ink">
                Ringkasan
              </h2>
            </div>
            {statsFailed && <ErrorBanner message="Ringkasan belum bisa dimuat." onRetry={load} />}
            <Card>
              <dl className="divide-y divide-dc-line">
                {[
                  { label: "Vendor aktif", value: stats?.active_vendors, href: "/internal/admin/vendors/approved", link: "Kelola komisi" },
                  { label: "Transaksi berjalan", value: stats?.ongoing_transactions, href: "/internal/admin/disbursements", link: "Lihat pencairan" },
                  { label: "Sengketa terbuka", value: stats?.open_disputes, href: "/internal/admin/disputes", link: "Tinjau sengketa" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <dt className="text-sm text-dc-text-2">{s.label}</dt>
                      <Link href={s.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
                        {s.link}
                      </Link>
                    </div>
                    <dd className="font-heading text-4xl font-semibold text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                      {s.value !== undefined ? <CountUp value={s.value} /> : statsFailed ? "-" : <Skeleton className="h-9 w-10" />}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>

          <section aria-labelledby="recent-title" className="min-w-0">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 id="recent-title" className="font-heading text-3xl text-dc-ink">
                Aktivitas terbaru
              </h2>
              <Link
                href="/internal/admin/audit-log"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
              >
                Buka audit log
              </Link>
            </div>
            {recentFailed ? (
              <ErrorState compact title="Aktivitas belum bisa dimuat" onRetry={load} />
            ) : recent === null ? (
              <Card className="p-5">
                <SkeletonGroup label="Memuat aktivitas" className="flex flex-col gap-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
                      <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </SkeletonGroup>
              </Card>
            ) : recent.length === 0 ? (
              <Card className="px-5 py-8 text-center text-dc-text-2">Belum ada aktivitas admin yang tercatat.</Card>
            ) : (
              <Card className="px-5 py-2">
                <MotionList as="ol">
                  {recent.map((e, i) => {
                    const detail = auditDetail(e.action, e.metadata);
                    return (
                      <MotionItem key={e.id} className="relative flex gap-4 py-4">
                        {i < recent.length - 1 && <span aria-hidden className="absolute bottom-0 left-[4.5px] top-9 w-px bg-dc-line" />}
                        <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-dc-gold bg-dc-white" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-dc-ink">{ACTION_LABEL[e.action] ?? "Perubahan oleh admin"}</p>
                          {detail.length > 0 && <p className="mt-0.5 break-words text-sm text-dc-text-2">{detail.join(" · ")}</p>}
                        </div>
                        <time dateTime={e.created_at} className="shrink-0 text-sm text-dc-text-3">
                          {relatif(e.created_at)}
                        </time>
                      </MotionItem>
                    );
                  })}
                </MotionList>
              </Card>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}
