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
import { apiGet, apiPost, ApiError, categoryLabel, type CurrentUser } from "@/lib/api";

type PendingVendor = {
  user_id: string;
  business_name: string;
  category: string;
  city: string;
  status: string;
};

export default function AdminVendorsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminVendorsContent user={user} />}
    </WithUser>
  );
}

function AdminVendorsContent({ user }: { user: CurrentUser }) {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingVendor | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { show } = useToast();

  async function load() {
    try {
      setVendors(await apiGet<PendingVendor[]>("/api/v1/admin/vendors/pending"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar vendor.");
    }
  }

  useEffect(() => {
    // `load()` sets state, so it can't be called directly in an effect body —
    // schedule it as a microtask instead of invoking it synchronously here.
    queueMicrotask(load);
  }, []);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/v1/admin/vendors/${id}/approve`, {});
      show("Vendor disetujui.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyetujui vendor.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const id = rejectTarget.user_id;
    setBusyId(id);
    try {
      await apiPost(`/api/v1/admin/vendors/${id}/reject`, { reason: rejectReason });
      show("Vendor ditolak.", "success");
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menolak vendor.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Vendor Menunggu Review" />
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {vendors.length === 0 ? (
          <EmptyState title="Tidak ada vendor yang menunggu review" />
        ) : (
          <ul className="space-y-3">
            {vendors.map((v) => (
              <li key={v.user_id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-dc-navy">{v.business_name}</p>
                    <p className="text-sm text-dc-black/60">
                      {categoryLabel(v.category)} · {v.city}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="w-auto" onClick={() => setRejectTarget(v)} disabled={busyId === v.user_id}>
                      Tolak
                    </Button>
                    <Button className="w-auto" onClick={() => handleApprove(v.user_id)} loading={busyId === v.user_id}>
                      Setujui
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Tolak ${rejectTarget?.business_name ?? ""}`}>
        <label className="block text-sm font-medium text-dc-navy">
          Alasan penolakan (opsional)
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-dc-black/15 px-3 py-2 text-sm outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="w-auto" onClick={() => setRejectTarget(null)}>
            Batal
          </Button>
          <Button className="w-auto" onClick={confirmReject} loading={busyId === rejectTarget?.user_id}>
            Tolak Vendor
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
