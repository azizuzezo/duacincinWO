"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { DangerButton, ErrorBanner, PAGE, RowsSkeleton, Tabs } from "../../_ui";
import { apiGet, apiPost, ApiError, type CurrentUser, type Dispute } from "@/lib/api";

export default function AdminDisputesPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminDisputesContent user={user} />}
    </WithUser>
  );
}

const SANCTIONS: { value: string; label: string }[] = [
  { value: "warning", label: "Peringatan" },
  { value: "suspend", label: "Tangguhkan 30 Hari" },
  { value: "terminate", label: "Putus Mitra Permanen" },
  { value: "none", label: "Tidak Ada Pelanggaran" },
];

function AdminDisputesContent({ user }: { user: CurrentUser }) {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loadedTab, setLoadedTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { show } = useToast();

  function load() {
    apiGet<Dispute[]>(`/api/v1/admin/disputes/${tab === "open" ? "open" : "resolved"}`)
      .then((data) => {
        setDisputes(data ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat sengketa."))
      .finally(() => setLoadedTab(tab));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleResolve(id: string, sanction: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/v1/admin/disputes/${id}/resolve`, { sanction });
      show("Sengketa diselesaikan.", "success");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyelesaikan sengketa.");
    } finally {
      setBusyId(null);
    }
  }

  const loading = loadedTab !== tab;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader title="Sengketa Anti-Circumvention" subtitle="Tinjau laporan dan tetapkan sanksi. Sanksi berat tidak bisa dibatalkan." />

        <Tabs
          label="Status sengketa"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "open", label: "Terbuka" },
            { value: "resolved", label: "Riwayat" },
          ]}
        />

        {error && <ErrorBanner message={error} onRetry={load} />}
        {loading ? (
          <RowsSkeleton />
        ) : disputes.length === 0 ? (
          !error && (
            <EmptyState
              title={tab === "open" ? "Tidak ada sengketa yang terbuka" : "Belum ada riwayat sengketa"}
              body={tab === "open" ? "Laporan baru dari klien akan muncul di sini." : undefined}
            />
          )
        ) : (
          <Card>
            <ul>
              {disputes.map((d, i) => (
                <li key={d.id} className={`px-4 py-4 ${i > 0 ? "border-t border-dc-ink/10" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <p className="font-semibold text-dc-ink">{d.vendor_business_name ?? `Vendor #${d.vendor_id.slice(0, 8)}`}</p>
                    <p className="text-xs tabular-nums text-dc-black/60">{new Date(d.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm text-dc-black/80">{d.reason}</p>
                  {tab === "open" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SANCTIONS.map((s) =>
                        s.value === "suspend" || s.value === "terminate" ? (
                          <DangerButton
                            key={s.value}
                            solid={s.value === "terminate"}
                            onClick={() => handleResolve(d.id, s.value)}
                            loading={busyId === d.id}
                          >
                            {s.label}
                          </DangerButton>
                        ) : (
                          <Button
                            key={s.value}
                            variant="ghost"
                            className="w-auto"
                            onClick={() => handleResolve(d.id, s.value)}
                            loading={busyId === d.id}
                          >
                            {s.label}
                          </Button>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 flex items-center gap-2 text-sm text-dc-black/70">
                      Sanksi:
                      <Badge tone={d.sanction_applied === "none" ? "success" : d.sanction_applied === "warning" ? "gold" : "danger"}>
                        {SANCTIONS.find((s) => s.value === d.sanction_applied)?.label ?? d.sanction_applied ?? "-"}
                      </Badge>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Shell>
  );
}
