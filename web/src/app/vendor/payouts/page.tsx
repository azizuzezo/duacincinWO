"use client";

import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  ApiError,
  formatRupiah,
  type CurrentUser,
  type Payout,
} from "@/lib/api";

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

  const [reload, setReload] = useState(0);

  useEffect(() => {
    apiGet<Payout[]>("/api/v1/vendor/payouts")
      .then((d) => setPayouts(d ?? []))
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "Gagal memuat data pencairan.",
        ),
      )
      .finally(() => setLoading(false));
  }, [reload]);

  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.net_amount, 0);
  const totalDisbursed = payouts
    .filter((p) => p.status === "disbursed")
    .reduce((sum, p) => sum + p.net_amount, 0);

  return (
    <Shell
      user={user}
      navItems={VENDOR_NAV}
      loginPath="/login"
      eyebrow="Vendor"
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Pencairan"
          subtitle="Estimasi pendapatan bersih (setelah komisi) dari booking yang sudah selesai."
        />

        <div className="mb-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <StatTile
            label="Menunggu dicairkan"
            value={formatRupiah(totalPending)}
            density="structured"
            accent="gold"
          />
          <StatTile
            label="Sudah dicairkan"
            value={formatRupiah(totalDisbursed)}
            density="structured"
            accent="ink"
          />
        </div>

        {loading && (
          <div
            className="flex flex-col gap-3"
            aria-busy="true"
            aria-label="Memuat pencairan"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-lg bg-dc-ink/5"
              />
            ))}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);

                setReload((n) => n + 1);
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-red-300 px-4 font-semibold hover:bg-red-100"
            >
              Coba lagi
            </button>
          </div>
        )}
        {!loading && !error && payouts.length === 0 && (
          <EmptyState
            title="Belum ada pencairan"
            body="Muncul di sini setelah booking-mu selesai dan dana diproses Admin."
          />
        )}

        <ul className="flex flex-col gap-3">
          {payouts.map((p) => (
            <li key={p.booking_id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold tabular-nums text-dc-ink">
                      {formatRupiah(p.net_amount)}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-dc-black/60">
                      Bruto {formatRupiah(p.gross_amount)} · Komisi{" "}
                      {formatRupiah(p.commission_amount)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}
