"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Audit Log" subtitle="Riwayat aksi admin: approve/reject vendor, sanksi, pencairan, dan perubahan komisi." />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {!loading && entries.length === 0 && <EmptyState title="Belum ada aktivitas tercatat" />}

        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-dc-navy">{ACTION_LABEL[e.action] ?? e.action}</p>
                    <p className="text-xs text-dc-black/50">
                      {e.target_type} #{e.target_id.slice(0, 8)} · oleh {e.actor_role}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-dc-black/40">{new Date(e.created_at).toLocaleString("id-ID")}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        {hasMore && entries.length > 0 && (
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
