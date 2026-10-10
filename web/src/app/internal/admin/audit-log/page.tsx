"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { ErrorBanner, PAGE, RowsSkeleton, TableCard, TD, TH, TR } from "../../_ui";
import { apiGet, ApiError, type AuditLogEntry, type CurrentUser } from "@/lib/api";

const ACTION_LABEL: Record<string, string> = {
  "vendor.approve": "Menyetujui vendor",
  "vendor.reject": "Menolak vendor",
  "vendor.set_commission": "Mengubah komisi vendor",
  "disbursement.mark_disbursed": "Menandai dana dicairkan",
  "dispute.resolve": "Menyelesaikan sengketa",
  "vendor_name_change.resolve": "Memproses ganti nama vendor",
};

const PAGE_SIZE = 30;

export default function AdminAuditLogPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminAuditLogContent user={user} />}
    </WithUser>
  );
}

function AdminAuditLogContent({ user }: { user: CurrentUser }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const page = await apiGet<AuditLogEntry[]>(`/api/v1/admin/audit-log?limit=${PAGE_SIZE}&offset=${offset}`);
      setEntries((prev) => [...prev, ...(page ?? [])]);
      setHasMore((page ?? []).length === PAGE_SIZE);
      setOffset((o) => o + (page ?? []).length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat audit log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(loadMore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader title="Audit Log" subtitle="Riwayat aksi admin: approve/reject vendor, sanksi, pencairan, dan perubahan komisi." />

        {error && <ErrorBanner message={error} onRetry={loadMore} />}
        {loading && entries.length === 0 && !error && <RowsSkeleton rows={8} />}
        {!loading && !error && entries.length === 0 && <EmptyState title="Belum ada aktivitas tercatat" body="Aksi admin akan tercatat di sini." />}

        {entries.length > 0 && (
          <TableCard minWidth="min-w-[640px]">
            <thead className="bg-dc-cream/50">
              <tr>
                <th scope="col" className={TH}>Waktu</th>
                <th scope="col" className={TH}>Aksi</th>
                <th scope="col" className={TH}>Target</th>
                <th scope="col" className={TH}>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className={TR}>
                  <td className={`${TD} whitespace-nowrap tabular-nums text-dc-black/70`}>{new Date(e.created_at).toLocaleString("id-ID")}</td>
                  <td className={`${TD} font-medium`}>{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className={`${TD} text-dc-black/70`}>
                    {e.target_type} <span className="tabular-nums">#{e.target_id.slice(0, 8)}</span>
                  </td>
                  <td className={`${TD} text-dc-black/70`}>{e.actor_role}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}

        {hasMore && entries.length > 0 && !error && (
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" className="w-auto" onClick={loadMore} loading={loading}>
              Muat Lebih Banyak
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
