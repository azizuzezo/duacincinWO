"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { ErrorBanner, NUM, PAGE, RowsSkeleton, TableCard, TD, TH, TR } from "../../_ui";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { show } = useToast();

  function load() {
    apiGet<Disbursement[]>("/api/v1/admin/disbursements/pending")
      .then((data) => {
        setItems(data ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar pencairan."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkDisbursed(bookingID: string) {
    setBusyId(bookingID);
    try {
      await apiPost(`/api/v1/admin/disbursements/${bookingID}/mark-disbursed`, {});
      show("Dana ditandai sudah dicairkan.", "success");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menandai pencairan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader title="Pencairan Dana Vendor" subtitle="Dana booking yang sudah selesai dan menunggu dicairkan ke vendor." />
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
        ) : items.length === 0 ? (
          !error && <EmptyState title="Tidak ada pencairan yang menunggu" body="Pencairan baru muncul di sini setelah booking selesai." />
        ) : (
          <TableCard minWidth="min-w-[720px]">
            <thead className="bg-dc-cream/50">
              <tr>
                <th scope="col" className={TH}>Vendor</th>
                <th scope="col" className={`${TH} ${NUM}`}>Bruto</th>
                <th scope="col" className={`${TH} ${NUM}`}>Komisi</th>
                <th scope="col" className={`${TH} ${NUM}`}>Bersih</th>
                <th scope="col" className={`${TH} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.booking_id} className={TR}>
                  <td className={`${TD} font-medium`}>{d.vendor_business_name ?? `Booking #${d.booking_id.slice(0, 8)}`}</td>
                  <td className={`${TD} ${NUM}`}>{formatRupiah(d.gross_amount)}</td>
                  <td className={`${TD} ${NUM} text-dc-black/70`}>{formatRupiah(d.commission_amount)}</td>
                  <td className={`${TD} ${NUM} font-semibold`}>{formatRupiah(d.net_amount)}</td>
                  <td className={`${TD} text-right`}>
                    <Button className="w-auto" onClick={() => handleMarkDisbursed(d.booking_id)} loading={busyId === d.booking_id}>
                      Tandai Dicairkan
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </div>
    </Shell>
  );
}
