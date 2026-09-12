"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";

type PendingNameChange = {
  id: string;
  vendor_id: string;
  current_name: string;
  requested_name: string;
  reason: string;
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
  const [requests, setRequests] = useState<PendingNameChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingNameChange | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const { show } = useToast();

  async function load() {
    try {
      setRequests(await apiGet<PendingNameChange[]>("/api/v1/admin/vendor-name-changes/pending"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar permintaan.");
    }
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

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

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Permintaan Ganti Nama Vendor" />
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {requests.length === 0 ? (
          <EmptyState title="Tidak ada permintaan ganti nama yang menunggu" />
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => (
              <li key={req.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-dc-black/60">
                        <span className="line-through">{req.current_name}</span>{" "}
                        <span className="font-semibold text-dc-navy">→ {req.requested_name}</span>
                      </p>
                      <p className="mt-2 text-sm text-dc-black/80">Alasan: {req.reason}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" className="w-auto" onClick={() => setRejectTarget(req)} disabled={busyId === req.id}>
                        Tolak
                      </Button>
                      <Button className="w-auto" onClick={() => handleApprove(req.id)} loading={busyId === req.id}>
                        Setujui
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Tolak permintaan ganti nama`}>
        <label className="block text-sm font-medium text-dc-navy">
          Catatan penolakan (opsional)
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-dc-black/15 px-3 py-2 text-sm outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="w-auto" onClick={() => setRejectTarget(null)}>
            Batal
          </Button>
          <Button className="w-auto" onClick={confirmReject} loading={busyId === rejectTarget?.id}>
            Tolak Permintaan
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
