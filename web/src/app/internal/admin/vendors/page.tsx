"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { DangerButton, ErrorBanner, INPUT, NUM, PAGE, RowsSkeleton, TableCard, TD, TEXTAREA, TH, TR } from "../../_ui";
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
  const [loading, setLoading] = useState(true);
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
      setVendors((await apiGet<PendingVendor[]>("/api/v1/admin/vendors/pending")) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar vendor.");
    } finally {
      setLoading(false);
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
      <div className={PAGE}>
        <PageHeader title="Vendor Menunggu Review" subtitle="Periksa pendaftaran vendor baru sebelum tampil di katalog." />
        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setLoading(true);
              load();
            }}
          />
        )}
        {loading ? (
          <RowsSkeleton />
        ) : vendors.length === 0 ? (
          !error && <EmptyState title="Tidak ada vendor yang menunggu review" body="Pendaftaran vendor baru akan muncul di sini." />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 sm:max-w-sm">
                <label htmlFor="vendor-search" className="sr-only">
                  Cari vendor
                </label>
                <input
                  id="vendor-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama usaha atau kota…"
                  className={INPUT}
                />
              </div>
              {selected.size > 0 && (
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium tabular-nums text-dc-ink">{selected.size} vendor dipilih</p>
                  <Button className="w-auto" onClick={handleBulkApprove} loading={bulkBusy}>
                    Setujui yang Dipilih
                  </Button>
                </div>
              )}
            </div>

            <TableCard minWidth="min-w-[720px]">
              <thead className="bg-dc-cream/50">
                <tr>
                  <th scope="col" className={`${TH} w-12`}>
                    <span className="sr-only">Pilih</span>
                  </th>
                  <th scope="col" className={TH}>Usaha</th>
                  <th scope="col" className={TH}>Kategori</th>
                  <th scope="col" className={TH}>Kota</th>
                  <th scope="col" className={`${TH} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {vendors
                  .filter((v) => {
                    const q = search.trim().toLowerCase();
                    return !q || v.business_name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q);
                  })
                  .map((v) => (
                    <tr key={v.user_id} className={TR}>
                      <td className={TD}>
                        <input
                          type="checkbox"
                          checked={selected.has(v.user_id)}
                          onChange={() => toggleSelect(v.user_id)}
                          className="h-5 w-5 accent-dc-ink"
                          aria-label={`Pilih ${v.business_name}`}
                        />
                      </td>
                      <td className={`${TD} font-semibold`}>{v.business_name}</td>
                      <td className={`${TD} text-dc-black/70`}>{categoryLabel(v.category)}</td>
                      <td className={`${TD} text-dc-black/70`}>{v.city}</td>
                      <td className={`${TD} ${NUM}`}>
                        <div className="flex justify-end gap-2">
                          <DangerButton onClick={() => setRejectTarget(v)} disabled={busyId === v.user_id}>
                            Tolak
                          </DangerButton>
                          <Button className="w-auto" onClick={() => handleApprove(v.user_id)} loading={busyId === v.user_id}>
                            Setujui
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TableCard>
          </>
        )}
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Tolak ${rejectTarget?.business_name ?? ""}`}>
        <label className="block text-sm font-medium text-dc-ink">
          Alasan penolakan (opsional)
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className={TEXTAREA}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="w-auto" onClick={() => setRejectTarget(null)}>
            Batal
          </Button>
          <DangerButton solid onClick={confirmReject} loading={busyId === rejectTarget?.user_id}>
            Tolak Vendor
          </DangerButton>
        </div>
      </Modal>
    </Shell>
  );
}
