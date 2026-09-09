"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, formatRupiah, type Disbursement } from "@/lib/api";

export default function AdminDisbursementsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/internal/login">
      {() => <AdminDisbursementsContent />}
    </WithUser>
  );
}

function AdminDisbursementsContent() {
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Pencairan Dana Vendor</h1>
        <Link href="/internal/admin/vendors" className="text-sm font-semibold text-dc-navy hover:text-dc-gold">
          ← Vendor Menunggu Review
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {items.length === 0 ? (
        <p className="text-dc-black/60">Tidak ada pencairan yang menunggu.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((d) => (
            <li key={d.booking_id} className="flex items-center justify-between rounded-2xl border border-dc-black/10 bg-dc-white p-4">
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
