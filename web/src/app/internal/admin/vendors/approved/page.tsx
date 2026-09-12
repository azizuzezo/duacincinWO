"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPatch, ApiError, categoryLabel, type CurrentUser, type VendorSummary } from "@/lib/api";

export default function ApprovedVendorsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <ApprovedVendorsContent user={user} />}
    </WithUser>
  );
}

function ApprovedVendorsContent({ user }: { user: CurrentUser }) {
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
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Vendor Aktif & Komisi" subtitle="Kosongkan lalu simpan untuk kembali ke komisi default platform (10%)." />
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <ul className="flex flex-col gap-3">
          {vendors.map((v) => (
            <li key={v.user_id}>
              <Card className="flex items-center justify-between p-4">
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
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}
