"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, formatRupiah, type CurrentUser, type Disbursement } from "@/lib/api";

export default function AdminDisbursementsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminDisbursementsContent user={user} />}
    </WithUser>
  );
}

function AdminDisbursementsContent({ user }: { user: CurrentUser }) {
  const [items, setItems] = useState<Disbursement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiGet<Disbursement[]>("/api/v1/admin/disbursements/pending")
      .then((data) => setItems(data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar pencairan."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkDisbursed(bookingID: string) {
    setBusyId(bookingID);
    try {
      await apiPost(`/api/v1/admin/disbursements/${bookingID}/mark-disbursed`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menandai pencairan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Pencairan Dana Vendor" />
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {items.length === 0 ? (
          <EmptyState title="Tidak ada pencairan yang menunggu" />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((d) => (
              <li key={d.booking_id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-dc-black/60">Booking #{d.booking_id.slice(0, 8)}</p>
                    <p className="font-medium text-dc-navy">
                      Bruto {formatRupiah(d.gross_amount)} − Komisi {formatRupiah(d.commission_amount)} ={" "}
                      <span className="font-bold">{formatRupiah(d.net_amount)}</span>
                    </p>
                  </div>
                  <Button className="w-auto" onClick={() => handleMarkDisbursed(d.booking_id)} loading={busyId === d.booking_id}>
                    Tandai Dicairkan
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
