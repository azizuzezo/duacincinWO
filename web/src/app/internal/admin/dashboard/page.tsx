"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { wdButton } from "@/components/home/ui";
import { WhatsAppAdminCard } from "@/components/wa/WhatsAppAdminCard";
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

  // The board is left open: refresh it when the admin comes back to the tab
  // and every minute while it is visible, so counts never sit stale.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      reloadQueues();
      load();
      setTick((t) => t + 1);
    };
    const id = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user.full_name?.split(" ")[0] ?? "";
  const open = queues ? QUEUES.filter((q) => queues[q.key] > 0) : [];
  const focus = open[0];
  const total = queues ? QUEUES.reduce((n, q) => n + queues[q.key], 0) : 0;

  const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <header>
          <p className="wd-kicker">{greeting && firstName ? `${greeting}, ${firstName}` : "Admin"}</p>
          <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
            Antrian <em>kerja</em>
          </h1>
          <p className="mt-2 text-wd-text">
            {queues
              ? total === 0
                ? "Tidak ada yang menunggu tindakanmu saat ini."
                : `${total} hal menunggu tindakanmu, diurutkan dari yang paling mendesak.`
              : "Apa yang menunggu tindakanmu, diurutkan dari yang paling mendesak."}
          </p>
        </header>

        {/* The most urgent queue, as one calm strip with its action. */}
        {focus && queues && (
          <section aria-label="Paling mendesak" className="mt-7 flex flex-col gap-4 rounded-[24px] bg-wd-accent-wash p-5 ring-2 ring-wd-accent sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-wd-accent-ink">Paling mendesak</p>
              <p className="wd-display mt-0.5 text-[clamp(1.3rem,2.2vw,1.7rem)] leading-tight">
                {queues[focus.key]} {focus.unit}: {focus.title.toLowerCase()}
              </p>
              <p className="mt-1 max-w-2xl text-[0.95rem] leading-relaxed text-wd-text">{focus.why}</p>
            </div>
            <Link href={focus.href} className={`${wdButton({ variant: "gold", size: "md" })} ${FOCUS} shrink-0`}>
              {focus.cta}
            </Link>
          </section>
        )}

        {/* One list in fixed urgency order (money in dispute first). */}
        <section aria-labelledby="antrian-title" className="mt-8">
          <h2 id="antrian-title" className="sr-only">
            Antrian kerja
          </h2>
          {queuesFailed && !queues ? (
            <ErrorState compact title="Antrian belum bisa dimuat" onRetry={reloadQueues} />
          ) : queuesLoading && !queues ? (
            <SkeletonGroup label="Memuat antrian kerja" className="border-t border-wd-line">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-5 border-b border-wd-line px-2 py-5">
                  <Skeleton className="h-10 w-12" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </SkeletonGroup>
          ) : (
            queues && (
              <MotionList className="border-t border-wd-line">
                {QUEUES.map((q) => {
                  const n = queues[q.key];
                  const isFocus = focus?.key === q.key;
                  return (
                    <MotionItem key={q.key} className="border-b border-wd-line">
                      <Link href={q.href} className={`group grid min-h-20 grid-cols-[3.25rem_1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl px-2 py-5 transition-colors hover:bg-wd-paper sm:grid-cols-[4.5rem_1fr_auto] sm:px-3 ${FOCUS}`}>
                        <span className={`wd-display leading-none tabular-nums ${isFocus ? "text-[3.4rem]" : "text-[2.8rem]"} ${n > 0 ? "" : "!text-wd-muted"}`}>
                          <CountUp value={n} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className={`wd-title text-[1.35rem] leading-tight ${n > 0 ? "" : "!text-wd-text"}`}>{q.title}</span>
                          </span>
                          <span className="mt-0.5 block text-sm leading-relaxed text-wd-text">{n > 0 ? q.why : "Tidak ada yang menunggu."}</span>
                        </span>
                        <span className={`hidden items-center text-sm font-semibold sm:inline-flex ${n > 0 ? "text-wd-accent-ink group-hover:underline group-hover:underline-offset-4" : "text-wd-muted"}`}>{n > 0 ? q.cta : "Kosong"}</span>
                      </Link>
                    </MotionItem>
                  );
                })}
              </MotionList>
            )
          )}
        </section>
        {queues && queuesFailed && (
          <p className="mt-3 text-sm text-wd-danger" role="alert">
            Angka antrian mungkin belum terbaru.{" "}
            <button type="button" onClick={reloadQueues} className="min-h-11 font-semibold underline underline-offset-4">
              Muat ulang
            </button>
          </p>
        )}

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
          <section aria-labelledby="ringkasan-title" className="min-w-0">
            <h2 id="ringkasan-title" className="wd-title mb-3 text-[clamp(1.4rem,2.2vw,1.8rem)]">
              Ringkasan <em>platform</em>
            </h2>
            {statsFailed && <ErrorBanner message="Ringkasan belum bisa dimuat." onRetry={load} />}
            <dl className="border-t border-wd-line">
              {[
                { label: "Vendor aktif", value: stats?.active_vendors, href: "/internal/admin/vendors/approved", link: "Kelola komisi" },
                { label: "Transaksi berjalan", value: stats?.ongoing_transactions, href: "/internal/admin/disbursements", link: "Lihat pencairan" },
                { label: "Sengketa terbuka", value: stats?.open_disputes, href: "/internal/admin/disputes", link: "Tinjau sengketa" },
              ].map((st) => (
                <div key={st.label} className="flex items-center justify-between gap-4 border-b border-wd-line px-1 py-4">
                  <div>
                    <dt className="text-sm text-wd-text">{st.label}</dt>
                    <Link href={st.href} className={`inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
                      {st.link}
                    </Link>
                  </div>
                  <dd className="wd-display text-[2.4rem] leading-none tabular-nums">{st.value !== undefined ? <CountUp value={st.value} /> : statsFailed ? "-" : <Skeleton className="h-9 w-10" />}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-10">
              <WhatsAppAdminCard refreshKey={tick} />
            </div>
          </section>

          <section aria-labelledby="recent-title" className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 id="recent-title" className="wd-title text-[clamp(1.4rem,2.2vw,1.8rem)]">
                Aktivitas <em>terbaru</em>
              </h2>
              <Link href="/internal/admin/audit-log" className={`inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
                Buka audit log
              </Link>
            </div>
            {recentFailed ? (
              <ErrorState compact title="Aktivitas belum bisa dimuat" onRetry={load} />
            ) : recent === null ? (
              <SkeletonGroup label="Memuat aktivitas" className="flex flex-col gap-5 border-t border-wd-line pt-5">
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
            ) : recent.length === 0 ? (
              <p className="border-t border-wd-line py-8 text-wd-text">Belum ada aktivitas admin yang tercatat.</p>
            ) : (
              <MotionList as="ol" className="border-t border-wd-line">
                {recent.map((e) => {
                  const detail = auditDetail(e.action, e.metadata);
                  return (
                    <MotionItem key={e.id} className="flex gap-4 border-b border-wd-line py-4">
                      <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-wd-accent" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-wd-ink">{ACTION_LABEL[e.action] ?? "Perubahan oleh admin"}</p>
                        {detail.length > 0 && <p className="mt-0.5 break-words text-sm text-wd-text">{detail.join(" · ")}</p>}
                      </div>
                      <time dateTime={e.created_at} className="shrink-0 text-sm text-wd-muted">
                        {relatif(e.created_at)}
                      </time>
                    </MotionItem>
                  );
                })}
              </MotionList>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
