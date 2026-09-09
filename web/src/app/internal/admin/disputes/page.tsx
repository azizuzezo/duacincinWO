"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type Dispute } from "@/lib/api";

export default function AdminDisputesPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/internal/login">
      {() => <AdminDisputesContent />}
    </WithUser>
  );
}

const SANCTIONS: { value: string; label: string }[] = [
  { value: "warning", label: "Peringatan" },
  { value: "suspend", label: "Tangguhkan 30 Hari" },
  { value: "terminate", label: "Putus Mitra Permanen" },
  { value: "none", label: "Tidak Ada Pelanggaran" },
];

function AdminDisputesContent() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiGet<Dispute[]>("/api/v1/admin/disputes/open")
      .then((data) => setDisputes(data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat sengketa."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResolve(id: string, sanction: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/v1/admin/disputes/${id}/resolve`, { sanction });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyelesaikan sengketa.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Sengketa Anti-Circumvention</h1>
        <Link href="/internal/admin/dashboard" className="text-sm font-semibold text-dc-navy hover:text-dc-gold">
          ← Dashboard
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {disputes.length === 0 ? (
        <p className="text-dc-black/60">Tidak ada sengketa yang terbuka.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {disputes.map((d) => (
            <li key={d.id} className="rounded-2xl border border-dc-black/10 bg-dc-white p-4">
              <p className="text-sm text-dc-black/60">Vendor #{d.vendor_id.slice(0, 8)}</p>
              <p className="font-medium text-dc-navy">{d.reason}</p>
              <p className="text-xs text-dc-black/40">{new Date(d.created_at).toLocaleString("id-ID")}</p>
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
