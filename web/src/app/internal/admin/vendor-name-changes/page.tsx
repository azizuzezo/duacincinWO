"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";
import { ConfirmDialog, DangerGhostButton, ErrorBanner, PAGE, QueueItem, RowsSkeleton, tanggal } from "../../_ui";

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

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Verifikasi vendor"
          title={
            <>
              Ganti <span className="dc-em">nama</span> vendor
            </>
          }
          subtitle="Nama baru langsung tampil di halaman publik vendor setelah kamu setujui."
        />

        <Tabs
          idBase="ganti-nama"
          label="Status permintaan"
          value={tab}
          onChange={(id) => {
            setError(null);
            setTab(id as "pending" | "resolved");
          }}
          items={[
            { id: "pending", label: "Menunggu", count: loadedTab === "pending" && !loadFailed ? requests.length : undefined },
            { id: "resolved", label: "Riwayat" },
          ]}
        />

        <TabPanel idBase="ganti-nama" id={tab} value={tab} className="mt-6">
          {error && !loadFailed && <ErrorBanner message={error} />}
          {loading ? (
            <RowsSkeleton rows={3} label="Memuat permintaan" />
          ) : loadFailed ? (
            <ErrorState title="Permintaan belum bisa dimuat" onRetry={() => { setError(null); load(); }} />
          ) : requests.length === 0 ? (
            <EmptyState
              title={pending ? "Tidak ada yang menunggu" : "Belum ada riwayat"}
              body={pending ? "Pengajuan ganti nama dari vendor akan muncul di sini." : "Pengajuan yang sudah kamu proses akan tercatat di sini."}
            />
          ) : (
            <ul className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
              {requests.map((req, i) => (
                <QueueItem key={req.id} index={i}>
                  <article className="rounded-xl border border-dc-line bg-dc-white" aria-label={`Ganti nama ${req.current_name} jadi ${req.requested_name}`}>
                    <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_1.1fr]">
                      {/* Old -> new reads as one line of change; the new name carries the weight. */}
                      <div>
                        <p className="text-sm text-dc-text-3">Nama sekarang</p>
                        <p className="mt-0.5 text-lg text-dc-text-2">{req.current_name}</p>
                        <p className="mt-3 text-sm text-dc-text-3">Diganti jadi</p>
                        <p className="mt-0.5 font-heading text-3xl leading-tight text-dc-ink">{req.requested_name}</p>
                      </div>
                      <div className="rounded-lg bg-dc-cream px-4 py-3">
                        <p className="text-sm font-semibold text-dc-ink">Alasan vendor</p>
                        <p className="mt-1 leading-relaxed text-dc-text-2">{req.reason || "Vendor tidak menulis alasan."}</p>
                        {req.created_at && <p className="mt-3 text-xs text-dc-text-3">Diajukan {tanggal(req.created_at)}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dc-line px-5 py-4 sm:px-6">
                      {pending ? (
                        <>
                          <span className="text-sm text-dc-text-3">Menunggu keputusanmu</span>
                          <div className="flex flex-wrap gap-2">
                            <DangerGhostButton onClick={() => setRejectTarget(req)} disabled={busyId === req.id}>
                              Tolak
                            </DangerGhostButton>
                            <Button size="sm" onClick={() => setApproveTarget(req)} disabled={busyId === req.id}>
                              Setujui nama baru
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Badge tone={req.status === "approved" ? "success" : "danger"}>{req.status === "approved" ? "Disetujui" : "Ditolak"}</Badge>
                          {req.admin_note && <p className="min-w-0 flex-1 text-sm text-dc-text-2 sm:text-right">Catatan: {req.admin_note}</p>}
                        </>
                      )}
                    </div>
                  </article>
                </QueueItem>
              ))}
              </AnimatePresence>
            </ul>
          )}
        </TabPanel>
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
    </Shell>
  );
}
