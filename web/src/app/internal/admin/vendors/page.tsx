"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, categoryLabel } from "@/lib/api";

type PendingVendor = {
  user_id: string;
  business_name: string;
  category: string;
  city: string;
  status: string;
};

export default function AdminVendorsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/internal/login">
      {() => <AdminVendorsContent />}
    </WithUser>
  );
}

function AdminVendorsContent() {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyetujui vendor.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Alasan penolakan (opsional):") ?? "";
    setBusyId(id);
    try {
      await apiPost(`/api/v1/admin/vendors/${id}/reject`, { reason });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menolak vendor.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Vendor Menunggu Review</h1>
        <Link href="/internal/admin/dashboard" className="text-sm font-semibold text-dc-navy hover:text-dc-gold">
          ← Dashboard
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {vendors.length === 0 ? (
        <p className="text-dc-black/60">Tidak ada vendor yang menunggu review.</p>
      ) : (
        <ul className="space-y-3">
          {vendors.map((v) => (
            <li key={v.user_id} className="flex items-center justify-between rounded-2xl border border-dc-black/10 bg-dc-white p-4">
              <div>
                <p className="font-semibold text-dc-navy">{v.business_name}</p>
                <p className="text-sm text-dc-black/60">
                  {categoryLabel(v.category)} · {v.city}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="w-auto" onClick={() => handleReject(v.user_id)} disabled={busyId === v.user_id}>
                  Tolak
                </Button>
                <Button className="w-auto" onClick={() => handleApprove(v.user_id)} loading={busyId === v.user_id}>
                  Setujui
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
