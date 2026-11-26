"use client";

import { useEffect, useRef, useState } from "react";

import { AdmHeader, ADM_FOCUS, Chips, ListSkeleton, SearchBox } from "@/components/admin/adm";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, type AuditLogEntry, type CurrentUser } from "@/lib/api";
import { ACTION_LABEL, auditDetail, ErrorBanner, jam, labelHari, relatif, tanggalJam } from "../../_ui";

const PAGE_SIZE = 30;

// Filter groups follow the admin's mental model (what kind of work), not the
// raw action keys. Each group maps to one or more recorded actions.
const GROUPS: { id: string; label: string; actions: string[] }[] = [
  { id: "semua", label: "Semua", actions: [] },
  { id: "verifikasi", label: "Verifikasi vendor", actions: ["vendor.approve", "vendor.reject", "vendor.delete"] },
  { id: "komisi", label: "Komisi", actions: ["vendor.set_commission"] },
  { id: "lokasi", label: "Lokasi vendor", actions: ["vendor.set_cities"] },
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

/** "Nama (Admin)", or "Kamu" for the viewer's own actions. */
function actorLabel(e: AuditLogEntry, viewerId: string): string {
  if (e.actor_id === viewerId) return "Kamu";
  return e.actor_name || e.actor_email || "Anggota tim";
}

/** Dot colour carries the outcome: red for rejections and sanctions, gold otherwise. */
function tone(e: AuditLogEntry): "danger" | "gold" {
  if (e.action === "vendor.reject" || e.action === "vendor.delete") return "danger";
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
  const [q, setQ] = useState("");

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
  const needle = q.trim().toLowerCase();
  const shown = entries.filter((e) => {
    if (g.actions.length > 0 && !g.actions.includes(e.action)) return false;
    if (!needle) return true;
    const hay = [ACTION_LABEL[e.action], ...auditDetail(e.action, e.metadata), e.actor_name, e.actor_email, TARGET_LABEL[e.target_type] ?? e.target_type, e.target_id].join(" ").toLowerCase();
    return hay.includes(needle);
  });

  // Bucket by calendar day so the log reads like a diary, newest first.
  const days: { label: string; items: AuditLogEntry[] }[] = [];
  for (const e of shown) {
    const label = labelHari(e.created_at);
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(e);
    else days.push({ label, items: [e] });
  }

  const firstLoad = loading && entries.length === 0;
  const filtering = group !== "semua" || needle !== "";

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHeader
          kicker="Sistem"
          title={
            <>
              Audit <em>log</em>
            </>
          }
          sub="Semua keputusan admin tercatat di sini: verifikasi vendor, komisi, pencairan, sengketa, dan ganti nama."
        />

        {entries.length > 0 && (
          <div className="mt-8 flex flex-col gap-3">
            <SearchBox value={q} onChange={setQ} label="Cari aktivitas" placeholder="Cari nama, vendor, atau catatan" />
            <Chips label="Saring jenis aktivitas" value={group} onChange={setGroup} items={GROUPS.map((x) => ({ id: x.id, label: x.label }))} />
            <p className="text-sm text-wd-muted" aria-live="polite">
              {filtering ? `${shown.length} dari ${entries.length} catatan dimuat` : `${entries.length} catatan dimuat`}
            </p>
          </div>
        )}

        <div className="mt-6">
          {error && entries.length > 0 && <ErrorBanner message={error} onRetry={loadMore} />}

          {firstLoad ? (
            <ListSkeleton rows={5} label="Memuat audit log" />
          ) : error && entries.length === 0 ? (
            <ErrorBanner message="Audit log belum bisa dimuat." onRetry={loadMore} />
          ) : entries.length === 0 ? (
            <Empty title="Belum ada aktivitas tercatat" body="Setiap keputusan admin akan tercatat di sini secara otomatis." />
          ) : shown.length === 0 ? (
            <Empty
              title="Tidak ada aktivitas yang cocok"
              body={hasMore ? `Belum ada di ${entries.length} catatan terbaru. Muat catatan yang lebih lama untuk mencari lagi.` : "Belum pernah ada aktivitas seperti ini."}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setGroup("semua");
                    setQ("");
                  }}
                  className={`${wdButton({ variant: "outline", size: "sm" })} ${ADM_FOCUS}`}
                >
                  Tampilkan semua
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-10">
              {days.map((day) => (
                <section key={day.label} aria-label={day.label}>
                  <h2 className="wd-display mb-2 text-[1.5rem] leading-tight">{day.label}</h2>
                  <ol className="divide-y divide-wd-line border-y border-wd-line">
                    {day.items.map((e) => {
                      const detail = auditDetail(e.action, e.metadata);
                      const t = tone(e);
                      return (
                        <li key={e.id} className="grid grid-cols-[4.5rem_1fr] gap-x-3 py-4 sm:grid-cols-[6.5rem_1fr_auto] sm:gap-x-5">
                          <time dateTime={e.created_at} title={tanggalJam(e.created_at)} className="pt-0.5 text-sm leading-snug text-wd-muted">
                            <span className="block font-semibold tabular-nums text-wd-ink">{jam(e.created_at)}</span>
                            {relatif(e.created_at)}
                          </time>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-semibold text-wd-ink">
                              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${t === "danger" ? "bg-wd-danger" : "bg-wd-gold"}`} />
                              {ACTION_LABEL[e.action] ?? "Perubahan oleh admin"}
                            </p>
                            {detail.map((line) => (
                              <p key={line} className="mt-0.5 break-words text-sm text-wd-text">
                                {line}
                              </p>
                            ))}
                            <p className="mt-1 text-xs text-wd-muted">
                              {TARGET_LABEL[e.target_type] ?? e.target_type} <span className="tabular-nums">#{e.target_id.slice(0, 8)}</span>
                              <span className="sm:hidden">
                                {" "}
                                · oleh <span className="font-semibold text-wd-text">{actorLabel(e, user.id)}</span> ({ROLE_LABEL[e.actor_role] ?? e.actor_role})
                              </span>
                            </p>
                          </div>
                          <div className="hidden max-w-56 self-start text-right sm:block" title={e.actor_email}>
                            <p className="truncate text-sm font-semibold text-wd-ink">{actorLabel(e, user.id)}</p>
                            <p className="text-xs text-wd-muted">{ROLE_LABEL[e.actor_role] ?? e.actor_role}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}

          {hasMore && entries.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={loadMore} disabled={loading} aria-busy={loading} className={`${wdButton({ variant: "outline", size: "md" })} ${ADM_FOCUS}`}>
                {loading ? "Memuat..." : "Muat catatan lebih lama"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-wd-paper px-6 py-12 text-center">
      <ClientArt kind="clipboard" className="h-16 w-16" />
      <p className="wd-display mt-4 text-[1.4rem]">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-wd-text">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
