"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { ErrorBanner, INPUT, NUM, PAGE, RowsSkeleton, TableCard, TD, TH, TR } from "../../../_ui";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { show } = useToast();

  function load() {
    apiGet<VendorSummary[]>("/api/v1/admin/vendors/approved")
      .then((data) => {
        setVendors(data ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar vendor."))
      .finally(() => setLoading(false));
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
      show("Komisi diperbarui.", "success");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan komisi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader title="Vendor Aktif & Komisi" subtitle="Kosongkan lalu simpan untuk kembali ke komisi default platform (10%)." />
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
          !error && <EmptyState title="Belum ada vendor aktif" body="Vendor yang disetujui akan muncul di sini." actionHref="/internal/admin/vendors" actionLabel="Lihat vendor menunggu review" />
        ) : (
          <>
            <div className="mb-4 max-w-sm">
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

            <TableCard minWidth="min-w-[760px]">
              <thead className="bg-dc-cream/50">
                <tr>
                  <th scope="col" className={TH}>Usaha</th>
                  <th scope="col" className={TH}>Kategori</th>
                  <th scope="col" className={TH}>Kota</th>
                  <th scope="col" className={`${TH} ${NUM}`}>Komisi (%)</th>
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
                      <td className={`${TD} font-semibold`}>{v.business_name}</td>
                      <td className={`${TD} text-dc-black/70`}>{categoryLabel(v.category)}</td>
                      <td className={`${TD} text-dc-black/70`}>{v.city}</td>
                      <td className={`${TD} ${NUM}`}>
                        <input
                          type="number"
                          aria-label={`Komisi ${v.business_name} dalam persen`}
                          placeholder={v.commission_rate ? String(v.commission_rate * 100) : "10 (default)"}
                          value={drafts[v.user_id] ?? (v.commission_rate ? String(v.commission_rate * 100) : "")}
                          onChange={(e) => setDrafts((d) => ({ ...d, [v.user_id]: e.target.value }))}
                          className={`${INPUT} ml-auto w-28 text-right tabular-nums`}
                        />
                      </td>
                      <td className={`${TD} text-right`}>
                        <Button className="w-auto" onClick={() => handleSaveCommission(v.user_id)} loading={busyId === v.user_id}>
                          Simpan
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TableCard>
          </>
        )}
      </div>
    </Shell>
  );
}
