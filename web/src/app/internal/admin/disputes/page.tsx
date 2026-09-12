"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
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
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { show } = useToast();

  function load() {
    apiGet<Dispute[]>(`/api/v1/admin/disputes/${tab === "open" ? "open" : "resolved"}`)
      .then((data) => setDisputes(data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat sengketa."));
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

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Sengketa Anti-Circumvention" />

        <div className="mb-5 flex gap-2">
          {(["open", "resolved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t ? "bg-dc-navy text-dc-white" : "bg-dc-white text-dc-navy/70 hover:bg-dc-offwhite"
              }`}
            >
              {t === "open" ? "Terbuka" : "Riwayat"}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {disputes.length === 0 ? (
          <EmptyState title={tab === "open" ? "Tidak ada sengketa yang terbuka" : "Belum ada riwayat sengketa"} />
        ) : (
          <ul className="flex flex-col gap-3">
            {disputes.map((d) => (
              <li key={d.id}>
                <Card className="p-4">
                  <p className="text-sm text-dc-black/60">{d.vendor_business_name ?? `Vendor #${d.vendor_id.slice(0, 8)}`}</p>
                  <p className="font-medium text-dc-navy">{d.reason}</p>
                  <p className="text-xs text-dc-black/40">{new Date(d.created_at).toLocaleString("id-ID")}</p>
                  {tab === "open" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SANCTIONS.map((s) => (
                        <Button
                          key={s.value}
                          variant={s.value === "none" ? "ghost" : "primary"}
                          className="w-auto text-xs"
                          onClick={() => handleResolve(d.id, s.value)}
                          loading={busyId === d.id}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-dc-navy">
                      Sanksi: {SANCTIONS.find((s) => s.value === d.sanction_applied)?.label ?? d.sanction_applied ?? "-"}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
