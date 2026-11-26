"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { VA_BTN_DANGER, VA_BTN_GOLD, VA_FOCUS, VaAlert, VaCount, VaEmpty, VaFailed, VaHeader, VaList, VaPill, VaRow, VaSkeleton } from "@/components/admin/VaKit";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";
import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";
import { ConfirmDialog, tanggal } from "../../_ui";

type PendingNameChange = {
  id: string;
  vendor_id: string;
  current_name: string;
  requested_name: string;
  reason: string;
  status?: string;
  admin_note?: string;
  created_at: string;
};

const REJECT_PICKS = ["Nama baru mirip vendor lain", "Nama baru tidak menggambarkan usaha", "Mohon lampirkan alasan yang lebih jelas"];

export default function AdminVendorNameChangesPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminVendorNameChangesContent user={user} />}
    </WithUser>
  );
}

function AdminVendorNameChangesContent({ user }: { user: CurrentUser }) {
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const [requests, setRequests] = useState<PendingNameChange[]>([]);
  const [loadedTab, setLoadedTab] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<PendingNameChange | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingNameChange | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const { show } = useToast();

  async function load() {
    try {
      setRequests((await apiGet<PendingNameChange[]>(`/api/v1/admin/vendor-name-changes/${tab}`)) ?? []);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar permintaan.");
    } finally {
      setLoadedTab(tab);
    }
  }

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function switchTab(next: "pending" | "resolved") {
    setError(null);
    setTab(next);
  }

  async function confirmApprove() {
    if (!approveTarget) return;
    const id = approveTarget.id;
    setBusyId(id);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/vendor-name-changes/${id}/resolve`, { approve: true, admin_note: "" });
      show(`Nama vendor diganti jadi ${approveTarget.requested_name}.`, "success");
      setApproveTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memproses permintaan.");
      setApproveTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    setBusyId(id);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/vendor-name-changes/${id}/resolve`, { approve: false, admin_note: rejectNote });
      show("Permintaan ganti nama ditolak.", "success");
      setRejectTarget(null);
      setRejectNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memproses permintaan.");
    } finally {
      setBusyId(null);
    }
  }

  const loading = loadedTab !== tab;
  const pending = tab === "pending";
  const reduced = useReducedMotion();
  const tabs = [
    { id: "pending" as const, label: "Menunggu", count: loadedTab === "pending" && !loadFailed ? requests.length : undefined },
    { id: "resolved" as const, label: "Riwayat", count: undefined },
  ];

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <VaHeader
          kicker="Verifikasi vendor"
          title={
            <>
              Ganti <em>nama</em> vendor
            </>
          }
          sub="Nama baru langsung tampil di halaman publik vendor setelah kamu setujui."
        />

        <div
          role="tablist"
          aria-label="Status permintaan"
          className="mt-7 flex gap-1 overflow-x-auto border-b border-wd-line [scrollbar-width:none]"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              switchTab(tab === "pending" ? "resolved" : "pending");
              document.getElementById(`ganti-nama-tab-${tab === "pending" ? "resolved" : "pending"}`)?.focus();
            }
          }}
        >
          {tabs.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                id={`ganti-nama-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls="ganti-nama-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => switchTab(t.id)}
                className={`relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${VA_FOCUS}`}
              >
                {t.label}
                <VaCount n={t.count} active={on} />
                {on && <motion.span layoutId={reduced ? undefined : "ganti-nama-underline"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
              </button>
            );
          })}
        </div>

        <div id="ganti-nama-panel" role="tabpanel" aria-labelledby={`ganti-nama-tab-${tab}`} className="mt-6">
          {error && !loadFailed && <VaAlert message={error} />}
          {loading ? (
            <VaSkeleton rows={3} label="Memuat permintaan" />
          ) : loadFailed ? (
            <VaFailed
              what="Permintaan"
              onRetry={() => {
                setError(null);
                load();
              }}
            />
          ) : requests.length === 0 ? (
            <VaEmpty art={pending ? "card" : "clipboard"} title={pending ? "Tidak ada yang menunggu" : "Belum ada riwayat"}>
              {pending ? "Pengajuan ganti nama dari vendor akan muncul di sini." : "Pengajuan yang sudah kamu proses akan tercatat di sini."}
            </VaEmpty>
          ) : (
            <VaList>
              {requests.map((req) => (
                <VaRow key={req.id}>
                  <article className="grid gap-x-8 gap-y-4 px-1 py-6 sm:px-2 md:grid-cols-[1.1fr_1fr]" aria-label={`Ganti nama ${req.current_name} jadi ${req.requested_name}`}>
                    <div className="min-w-0">
                      <p className="text-sm text-wd-muted">Nama sekarang</p>
                      <p className="mt-0.5 break-words text-lg text-wd-text line-through decoration-wd-line-2">
                        <span className="sr-only">Nama sekarang: </span>
                        {req.current_name}
                      </p>
                      <p className="mt-3 text-sm text-wd-muted">Diganti jadi</p>
                      <p className="wd-display mt-0.5 break-words text-3xl leading-tight">{req.requested_name}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="rounded-2xl bg-wd-accent-wash px-4 py-3">
                        <p className="text-sm font-semibold text-wd-ink">Alasan vendor</p>
                        <p className="mt-1 break-words leading-relaxed text-wd-text">{req.reason || "Vendor tidak menulis alasan."}</p>
                        {req.created_at && <p className="mt-2 text-xs text-wd-muted">Diajukan {tanggal(req.created_at)}</p>}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        {pending ? (
                          <>
                            <VaPill tone="warn">Menunggu keputusanmu</VaPill>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => setRejectTarget(req)} disabled={busyId === req.id} className={VA_BTN_DANGER}>
                                Tolak
                              </button>
                              <button type="button" onClick={() => setApproveTarget(req)} disabled={busyId === req.id} className={VA_BTN_GOLD}>
                                Setujui nama baru
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <VaPill tone={req.status === "approved" ? "ok" : "danger"}>{req.status === "approved" ? "Disetujui" : "Ditolak"}</VaPill>
                            {req.admin_note && <p className="min-w-0 flex-1 break-words text-sm text-wd-text sm:text-right">Catatan: {req.admin_note}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                </VaRow>
              ))}
            </VaList>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={confirmApprove}
        busy={!!approveTarget && busyId === approveTarget.id}
        tone="primary"
        title="Setujui nama baru?"
        consequence={
          <>
            <span className="text-dc-text-2">{approveTarget?.current_name}</span> akan tampil sebagai{" "}
            <span className="font-semibold text-dc-ink">{approveTarget?.requested_name}</span> di direktori dan halaman vendor. Vendor mendapat notifikasi.
          </>
        }
        confirmLabel="Ganti nama"
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setRejectNote("");
        }}
        onConfirm={confirmReject}
        busy={!!rejectTarget && busyId === rejectTarget.id}
        title="Tolak permintaan ganti nama?"
        consequence={
          <>
            Nama tetap <span className="font-semibold">{rejectTarget?.current_name}</span>. Vendor mendapat notifikasi. Catatanmu tersimpan di riwayat.
          </>
        }
        confirmLabel="Tolak permintaan"
        reason={{ value: rejectNote, onChange: setRejectNote, label: "Catatan untuk vendor", picks: REJECT_PICKS }}
      />
    </AdminShell>
  );
}
