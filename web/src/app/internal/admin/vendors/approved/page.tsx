"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPatch, ApiError, categoryLabel, type VendorSummary } from "@/lib/api";

export default function ApprovedVendorsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/internal/login">
      {() => <ApprovedVendorsContent />}
    </WithUser>
  );
}

function ApprovedVendorsContent() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiGet<VendorSummary[]>("/api/v1/admin/vendors/approved")
      .then((data) => setVendors(data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar vendor."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaveCommission(userId: string) {
    setBusyId(userId);
    try {
      const raw = drafts[userId];
      const rate = raw === undefined || raw === "" ? null : Number(raw) / 100;
      await apiPatch(`/api/v1/admin/vendors/${userId}/commission`, { rate });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan komisi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Vendor Aktif &amp; Komisi</h1>
        <Link href="/internal/admin/dashboard" className="text-sm font-semibold text-dc-navy hover:text-dc-gold">
          ← Dashboard
        </Link>
      </div>
      <p className="mb-4 text-sm text-dc-black/60">
        Kosongkan lalu simpan untuk kembali ke komisi default platform (10%).
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <ul className="flex flex-col gap-3">
        {vendors.map((v) => (
          <li key={v.user_id} className="flex items-center justify-between rounded-2xl border border-dc-black/10 bg-dc-white p-4">
            <div>
              <p className="font-medium text-dc-navy">{v.business_name}</p>
              <p className="text-sm text-dc-black/60">
                {categoryLabel(v.category)} · {v.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={v.commission_rate ? String(v.commission_rate * 100) : "10 (default)"}
                value={drafts[v.user_id] ?? (v.commission_rate ? String(v.commission_rate * 100) : "")}
                onChange={(e) => setDrafts((d) => ({ ...d, [v.user_id]: e.target.value }))}
                className="w-24 rounded-xl border border-dc-black/15 px-3 py-1.5 text-right outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
              <span className="text-sm text-dc-black/60">%</span>
              <Button className="w-auto" onClick={() => handleSaveCommission(v.user_id)} loading={busyId === v.user_id}>
                Simpan
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
