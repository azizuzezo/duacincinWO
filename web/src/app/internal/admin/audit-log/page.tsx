"use client";

import { useEffect, useRef, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { MotionItem, MotionList } from "@/components/ui/Motion";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, type AuditLogEntry, type CurrentUser } from "@/lib/api";
import { ACTION_LABEL, auditDetail, ErrorBanner, jam, labelHari, PAGE } from "../../_ui";

const PAGE_SIZE = 30;

// Filter groups follow the admin's mental model (what kind of work), not the
// raw action keys. Each group maps to one or more recorded actions.
const GROUPS: { id: string; label: string; actions: string[] }[] = [
  { id: "semua", label: "Semua", actions: [] },
  { id: "verifikasi", label: "Verifikasi vendor", actions: ["vendor.approve", "vendor.reject"] },
  { id: "komisi", label: "Komisi", actions: ["vendor.set_commission"] },
  { id: "pencairan", label: "Pencairan", actions: ["disbursement.mark_disbursed"] },
  { id: "sengketa", label: "Sengketa", actions: ["dispute.resolve"] },
  { id: "nama", label: "Ganti nama", actions: ["vendor_name_change.resolve"] },
];

const TARGET_LABEL: Record<string, string> = {
  vendor: "Vendor",
  booking: "Booking",
  dispute: "Sengketa",
  vendor_name_change: "Pengajuan ganti nama",
};

const ROLE_LABEL: Record<string, string> = { admin: "Admin", wedding_consultant: "Konsultan" };

/** Dot colour carries the outcome: red for rejections and sanctions, gold otherwise. */
function tone(e: AuditLogEntry): "danger" | "gold" {
  if (e.action === "vendor.reject") return "danger";
  if (e.action === "dispute.resolve" && (e.metadata?.sanction === "suspend" || e.metadata?.sanction === "terminate")) return "danger";
  if (e.action === "vendor_name_change.resolve" && e.metadata?.status === "rejected") return "danger";
  return "gold";
}

export default function AdminAuditLogPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminAuditLogContent user={user} />}
    </WithUser>
  );
}

function AdminAuditLogContent({ user }: { user: CurrentUser }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState("semua");

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const page = await apiGet<AuditLogEntry[]>(`/api/v1/admin/audit-log?limit=${PAGE_SIZE}&offset=${offset}`);
      // Merge by id so a repeated request (e.g. dev double-mount) never duplicates rows.
      setEntries((prev) => [...prev, ...(page ?? []).filter((e) => !prev.some((x) => x.id === e.id))]);
      setHasMore((page ?? []).length === PAGE_SIZE);
      setOffset((o) => o + (page ?? []).length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat audit log.");
    } finally {
      setLoading(false);
    }
  }

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    queueMicrotask(loadMore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const g = GROUPS.find((x) => x.id === group)!;
  const shown = g.actions.length === 0 ? entries : entries.filter((e) => g.actions.includes(e.action));

  // Bucket by calendar day so the log reads like a diary, newest first.
  const days: { label: string; items: AuditLogEntry[] }[] = [];
  for (const e of shown) {
    const label = labelHari(e.created_at);
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(e);
    else days.push({ label, items: [e] });
  }

  const firstLoad = loading && entries.length === 0;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Sistem"
          title={
            <>
              Audit <span className="dc-em">log</span>
            </>
          }
          subtitle="Semua keputusan admin tercatat di sini: verifikasi vendor, komisi, pencairan, sengketa, dan ganti nama."
        />

        {entries.length > 0 && (
          <div className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <div role="group" aria-label="Saring jenis aktivitas" className="flex w-max gap-2">
              {GROUPS.map((x) => {
                const on = group === x.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setGroup(x.id)}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                      on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-text-2 hover:border-dc-ink hover:text-dc-ink"
                    }`}
                  >
                    {x.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && entries.length > 0 && <ErrorBanner message={error} onRetry={loadMore} />}

        {firstLoad ? (
          <SkeletonGroup label="Memuat audit log" className="flex flex-col gap-6">
            {[0, 1].map((d) => (
              <div key={d}>
                <Skeleton className="mb-4 h-5 w-40" />
                <div className="flex flex-col gap-5 rounded-xl border border-dc-line bg-dc-white p-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-4 w-12" />
                      <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </SkeletonGroup>
        ) : error && entries.length === 0 ? (
          <ErrorState title="Audit log belum bisa dimuat" onRetry={loadMore} />
        ) : entries.length === 0 ? (
          <EmptyState title="Belum ada aktivitas tercatat" body="Setiap keputusan admin akan tercatat di sini secara otomatis." />
        ) : shown.length === 0 ? (
          <EmptyState
            title="Tidak ada aktivitas jenis ini"
            body={hasMore ? `Belum ada di ${entries.length} catatan terbaru. Muat catatan yang lebih lama untuk mencari lagi.` : "Belum pernah ada aktivitas jenis ini."}
            action={
              <Button variant="ghost" size="sm" onClick={() => setGroup("semua")}>
                Tampilkan semua
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-8">
            {days.map((day) => (
              <section key={day.label} aria-label={day.label}>
                <h2 className="mb-3 font-heading text-2xl text-dc-ink">{day.label}</h2>
                <MotionList as="ol" inView className="rounded-xl border border-dc-line bg-dc-white px-4 sm:px-5">
                  {day.items.map((e, i) => {
                    const detail = auditDetail(e.action, e.metadata);
                    const t = tone(e);
                    return (
                      <MotionItem key={e.id} layout={false} className={`relative grid grid-cols-[3.25rem_1fr] gap-x-3 py-4 sm:grid-cols-[4rem_1fr_auto] sm:gap-x-4 ${i > 0 ? "border-t border-dc-line" : ""}`}>
                        <time dateTime={e.created_at} className="pt-0.5 text-sm tabular-nums text-dc-text-3">
                          {jam(e.created_at)}
                        </time>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-semibold text-dc-ink">
                            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${t === "danger" ? "bg-dc-danger" : "bg-dc-gold"}`} />
                            {ACTION_LABEL[e.action] ?? e.action}
                          </p>
                          {detail.map((line) => (
                            <p key={line} className="mt-0.5 break-words text-sm text-dc-text-2">
                              {line}
                            </p>
                          ))}
                          <p className="mt-1 text-xs text-dc-text-3">
                            {TARGET_LABEL[e.target_type] ?? e.target_type} <span className="tabular-nums">#{e.target_id.slice(0, 8)}</span>
                            <span className="sm:hidden"> · oleh {ROLE_LABEL[e.actor_role] ?? e.actor_role}</span>
                          </p>
                        </div>
                        <p className="hidden self-start rounded-full bg-dc-cream px-3 py-1 text-xs font-semibold text-dc-text-2 sm:block">{ROLE_LABEL[e.actor_role] ?? e.actor_role}</p>
                      </MotionItem>
                    );
                  })}
                </MotionList>
              </section>
            ))}
          </div>
        )}

        {hasMore && entries.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <Button variant="ghost" onClick={loadMore} loading={loading}>
              Muat catatan lebih lama
            </Button>
            <p className="text-xs text-dc-text-3">{entries.length} catatan dimuat</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
