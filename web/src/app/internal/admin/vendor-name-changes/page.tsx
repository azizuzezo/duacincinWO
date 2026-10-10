"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { DangerButton, ErrorBanner, PAGE, RowsSkeleton, TableCard, Tabs, TD, TH, TEXTAREA, TR } from "../../_ui";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";

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
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingNameChange | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const { show } = useToast();

  async function load() {
    try {
      setRequests((await apiGet<PendingNameChange[]>(`/api/v1/admin/vendor-name-changes/${tab}`)) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar permintaan.");
    } finally {
      setLoadedTab(tab);
    }
  }

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/v1/admin/vendor-name-changes/${id}/resolve`, { approve: true, admin_note: "" });
      show("Permintaan ganti nama disetujui.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memproses permintaan.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    setBusyId(id);
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

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader title="Permintaan Ganti Nama Vendor" subtitle="Setujui atau tolak permintaan perubahan nama usaha dari vendor." />

        <Tabs
          label="Status permintaan"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "pending", label: "Menunggu" },
            { value: "resolved", label: "Riwayat" },
          ]}
        />

        {error && <ErrorBanner message={error} onRetry={load} />}
        {loading ? (
          <RowsSkeleton />
        ) : requests.length === 0 ? (
          !error && <EmptyState title={tab === "pending" ? "Tidak ada permintaan ganti nama yang menunggu" : "Belum ada riwayat"} />
        ) : (
          <TableCard minWidth="min-w-[760px]">
            <thead className="bg-dc-cream/50">
              <tr>
                <th scope="col" className={TH}>Nama lama</th>
                <th scope="col" className={TH}>Nama baru</th>
                <th scope="col" className={TH}>Alasan</th>
                <th scope="col" className={`${TH} text-right`}>{tab === "pending" ? "Aksi" : "Hasil"}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className={TR}>
                  <td className={`${TD} text-dc-black/70`}>{req.current_name}</td>
                  <td className={`${TD} font-semibold`}>{req.requested_name}</td>
                  <td className={`${TD} max-w-xs text-dc-black/80`}>{req.reason}</td>
                  <td className={`${TD} text-right`}>
                    {tab === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <DangerButton onClick={() => setRejectTarget(req)} disabled={busyId === req.id}>
                          Tolak
                        </DangerButton>
                        <Button className="w-auto" onClick={() => handleApprove(req.id)} loading={busyId === req.id}>
                          Setujui
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={req.status === "approved" ? "success" : "danger"}>{req.status === "approved" ? "Disetujui" : "Ditolak"}</Badge>
                        {req.admin_note && <span className="text-xs text-dc-black/70">{req.admin_note}</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Tolak permintaan ganti nama`}>
        <label className="block text-sm font-medium text-dc-ink">
          Catatan penolakan (opsional)
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            className={TEXTAREA}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="w-auto" onClick={() => setRejectTarget(null)}>
            Batal
          </Button>
          <DangerButton solid onClick={confirmReject} loading={busyId === rejectTarget?.id}>
            Tolak Permintaan
          </DangerButton>
        </div>
      </Modal>
    </Shell>
  );
}
