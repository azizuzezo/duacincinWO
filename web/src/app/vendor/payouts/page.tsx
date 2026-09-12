"use client";

import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, formatRupiah, type CurrentUser, type Payout } from "@/lib/api";

const STATUS_TONE: Record<string, "gold" | "success"> = {
  pending: "gold",
  disbursed: "success",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Dicairkan",
  disbursed: "Sudah Dicairkan",
};

export default function VendorPayoutsPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorPayoutsContent user={user} />}
    </WithUser>
  );
}

function VendorPayoutsContent({ user }: { user: CurrentUser }) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Payout[]>("/api/v1/vendor/payouts")
      .then((d) => setPayouts(d ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat data pencairan."))
      .finally(() => setLoading(false));
  }, []);

  const totalPending = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.net_amount, 0);
  const totalDisbursed = payouts.filter((p) => p.status === "disbursed").reduce((sum, p) => sum + p.net_amount, 0);

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title="Pencairan" subtitle="Estimasi pendapatan bersih (setelah komisi) dari booking yang sudah selesai." />

        <div className="mb-6 grid grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-dc-black/50">Menunggu Dicairkan</p>
            <p className="font-heading mt-1 text-xl font-extrabold text-dc-navy">{formatRupiah(totalPending)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-dc-black/50">Sudah Dicairkan</p>
            <p className="font-heading mt-1 text-xl font-extrabold text-dc-navy">{formatRupiah(totalDisbursed)}</p>
          </Card>
        </div>

        {loading && <p className="text-dc-black/60">Memuat…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && payouts.length === 0 && (
          <EmptyState title="Belum ada pencairan" body="Muncul di sini setelah booking-mu selesai dan dana diproses Admin." />
        )}

        <ul className="flex flex-col gap-3">
          {payouts.map((p) => (
            <li key={p.booking_id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-dc-navy">{formatRupiah(p.net_amount)}</p>
                    <p className="text-xs text-dc-black/50">
                      Bruto {formatRupiah(p.gross_amount)} · Komisi {formatRupiah(p.commission_amount)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}
