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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkApprove() {
    setBulkBusy(true);
    try {
      const res = await apiPost<{ approved: number }>("/api/v1/admin/vendors/bulk-approve", { ids: Array.from(selected) });
      show(`${res.approved} vendor disetujui.`, "success");
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyetujui vendor terpilih.");
    } finally {
      setBulkBusy(false);
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
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama usaha atau kota…"
              className="mb-5 w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
            />

            {selected.size > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-dc-navy/5 px-4 py-3">
                <p className="text-sm font-medium text-dc-navy">{selected.size} vendor dipilih</p>
                <Button className="w-auto" onClick={handleBulkApprove} loading={bulkBusy}>
                  Setujui yang Dipilih
                </Button>
              </div>
            )}

            <ul className="space-y-3">
              {vendors
                .filter((v) => {
                  const q = search.trim().toLowerCase();
                  return !q || v.business_name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q);
                })
                .map((v) => (
              <li key={v.user_id}>
                <Card className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(v.user_id)}
                      onChange={() => toggleSelect(v.user_id)}
                      className="h-4 w-4 accent-dc-navy"
                      aria-label={`Pilih ${v.business_name}`}
                    />
                    <div>
                      <p className="font-semibold text-dc-navy">{v.business_name}</p>
                      <p className="text-sm text-dc-black/60">
                        {categoryLabel(v.category)} · {v.city}
                      </p>
                    </div>
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
          </>
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
