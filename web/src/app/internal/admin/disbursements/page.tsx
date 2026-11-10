"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FundStatus } from "@/components/ui/FundStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, formatRupiah, type CurrentUser, type Disbursement } from "@/lib/api";
import { ConfirmDialog, ErrorBanner, Monogram, PAGE, QueueItem, RowsSkeleton } from "../../_ui";

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
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [target, setTarget] = useState<Disbursement | null>(null);
  const { show } = useToast();

  function load() {
    apiGet<Disbursement[]>("/api/v1/admin/disbursements/pending")
      .then((data) => {
        setItems(data ?? []);
        setLoadFailed(false);
      })
      .catch((err) => {
        setLoadFailed(true);
        setError(err instanceof ApiError ? err.message : "Gagal memuat daftar pencairan.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function confirmMark() {
    if (!target) return;
    const bookingID = target.booking_id;
    setBusyId(bookingID);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/disbursements/${bookingID}/mark-disbursed`, {});
      show("Dana ditandai sudah dicairkan. Vendor mendapat notifikasi.", "success");
      setTarget(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menandai pencairan.");
      setTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  const totalNet = items.reduce((n, d) => n + d.net_amount, 0);
  const totalCommission = items.reduce((n, d) => n + d.commission_amount, 0);
  const vendorName = (d: Disbursement) => d.vendor_business_name ?? `Booking #${d.booking_id.slice(0, 8)}`;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Uang dan sengketa"
          title={
            <>
              Pencairan <span className="dc-em">dana</span> vendor
            </>
          }
          subtitle="Acara sudah dikonfirmasi selesai oleh client. Transfer dana bersih ke vendor, lalu tandai di sini."
        />

        {error && !loadFailed && <ErrorBanner message={error} />}

        {loading ? (
          <RowsSkeleton rows={3} label="Memuat pencairan" />
        ) : loadFailed ? (
          <ErrorState
            title="Daftar pencairan belum bisa dimuat"
            onRetry={() => {
              setLoading(true);
              setError(null);
              load();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState title="Tidak ada pencairan yang menunggu" body="Booking yang acaranya sudah selesai akan masuk ke sini untuk dicairkan." />
        ) : (
          <>
            {/* Totals first: the admin needs to know how much to move before row detail. */}
            <Card className="mb-6 grid grid-cols-2 gap-5 p-5 sm:grid-cols-[1.4fr_1fr_1fr] sm:p-6">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-sm text-dc-text-2">Total yang perlu ditransfer</p>
                <p className="mt-1 font-heading text-4xl font-semibold text-dc-ink [font-variant-numeric:lining-nums_tabular-nums] sm:text-5xl">{formatRupiah(totalNet)}</p>
              </div>
              <div>
                <p className="text-sm text-dc-text-2">Booking</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-dc-ink">{items.length}</p>
              </div>
              <div>
                <p className="text-sm text-dc-text-2">Komisi platform</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-dc-ink sm:text-2xl">{formatRupiah(totalCommission)}</p>
              </div>
            </Card>

            <ul className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
              {items.map((d, i) => (
                <QueueItem key={d.booking_id} index={i}>
                  <article className="grid gap-5 rounded-xl border border-dc-line bg-dc-white p-5 sm:p-6 md:grid-cols-[1fr_1.2fr_auto] md:items-center" aria-label={`Pencairan untuk ${vendorName(d)}`}>
                    <div className="flex min-w-0 items-start gap-3">
                      <Monogram name={vendorName(d)} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-heading text-2xl leading-tight text-dc-ink">{vendorName(d)}</p>
                        <p className="mt-0.5 text-sm text-dc-text-3">Booking #{d.booking_id.slice(0, 8)}</p>
                        <div className="mt-3">
                          <FundStatus status="full_paid" />
                        </div>
                      </div>
                    </div>

                    <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 rounded-lg bg-dc-cream px-4 py-3 text-sm">
                      <dt className="text-dc-text-2">Dibayar client</dt>
                      <dd className="text-right tabular-nums text-dc-ink">{formatRupiah(d.gross_amount)}</dd>
                      <dt className="text-dc-text-2">Komisi platform</dt>
                      <dd className="text-right tabular-nums text-dc-ink">- {formatRupiah(d.commission_amount)}</dd>
                      <dt className="border-t border-dc-line-strong pt-2 font-semibold text-dc-ink">Ditransfer ke vendor</dt>
                      <dd className="border-t border-dc-line-strong pt-2 text-right text-lg font-semibold tabular-nums text-dc-ink">{formatRupiah(d.net_amount)}</dd>
                    </dl>

                    <Button onClick={() => setTarget(d)} loading={busyId === d.booking_id} className="w-full md:w-auto">
                      Tandai sudah ditransfer
                    </Button>
                  </article>
                </QueueItem>
              ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={confirmMark}
        busy={!!target && busyId === target.booking_id}
        tone="primary"
        title="Dana sudah ditransfer?"
        consequence={
          <>
            Tandai hanya setelah <span className="font-semibold text-dc-ink">{target ? formatRupiah(target.net_amount) : ""}</span> benar-benar masuk ke rekening{" "}
            <span className="font-semibold text-dc-ink">{target ? vendorName(target) : ""}</span>. Vendor langsung mendapat notifikasi bahwa dana sudah dicairkan, dan tanda ini
            tidak bisa dibatalkan dari halaman ini.
          </>
        }
        confirmLabel="Ya, sudah ditransfer"
      />
    </Shell>
  );
}
