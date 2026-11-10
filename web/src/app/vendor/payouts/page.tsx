"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FundStatus } from "@/components/ui/FundStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { CountUp } from "@/components/ui/Motion";
import { formatTanggal, heldAmount } from "@/components/vendor-ops/ops";
import { StaggerItem, StaggerList } from "@/components/vendor-ops/motion";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  ApiError,
  formatRupiah,
  type Booking,
  type CurrentUser,
  type Payout,
} from "@/lib/api";

const STATUS_TONE: Record<string, "gold" | "success"> = {
  pending: "gold",
  disbursed: "success",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu ditransfer",
  disbursed: "Sudah ditransfer",
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    apiGet<Payout[]>("/api/v1/vendor/payouts")
      .then((d) => setPayouts(d ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat data pencairan."))
      .finally(() => setLoading(false));
    // The vendor's own bookings: escrow balance still held and a readable name
    // + date for each payout. Optional; the page works without it.
    apiGet<Booking[]>("/api/v1/bookings")
      .then((d) => setBookings(d ?? []))
      .catch(() => {});
  }, [reload]);

  const byId = new Map(bookings.map((b) => [b.id, b]));
  const totalPending = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.net_amount, 0);
  const totalDisbursed = payouts.filter((p) => p.status === "disbursed").reduce((sum, p) => sum + p.net_amount, 0);
  const held = bookings.reduce((sum, b) => sum + heldAmount(b), 0);
  const heldCount = bookings.filter((b) => heldAmount(b) > 0).length;
  // Pending first (what the vendor is waiting for), then transferred.
  const history = payouts.slice().sort((a, b) => (a.status === b.status ? 0 : a.status === "pending" ? -1 : 1));

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          eyebrow="Pencairan"
          title={
            <>
              Uang <span className="dc-em">usahamu</span>
            </>
          }
          subtitle="Dana dari client ditahan escrow sampai acara selesai, lalu diteruskan ke kamu setelah dipotong komisi."
        />

        {loading ? (
          <SkeletonGroup label="Memuat pencairan" className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </SkeletonGroup>
        ) : error ? (
          <ErrorState
            title="Pencairan belum bisa dimuat"
            body={error}
            onRetry={() => {
              setLoading(true);
              setError(null);
              setReload((n) => n + 1);
            }}
          />
        ) : (
          <>
            {/* Balance: the big number is what the vendor is owed now; escrow
                is the money that becomes theirs after upcoming events. */}
            <div className="animate-fade-up grid gap-4 md:grid-cols-[1.4fr_1fr]">
              <Card tone="ink" className="relative overflow-hidden p-6 sm:p-8">
                <svg aria-hidden viewBox="0 0 64 40" fill="none" className="pointer-events-none absolute -right-10 -top-12 h-48 w-72 opacity-[0.16]">
                  <circle cx="24" cy="20" r="16" stroke="var(--dc-gold-antique)" strokeWidth="0.4" />
                  <circle cx="40" cy="20" r="16" stroke="var(--dc-gold-antique)" strokeWidth="0.4" />
                </svg>
                <p className="relative text-sm font-medium text-dc-on-dark/80">Siap ditransfer ke kamu</p>
                <p className="relative mt-1 font-heading text-[2.6rem] font-semibold leading-tight text-dc-on-dark [font-variant-numeric:lining-nums_tabular-nums] sm:text-[3.2rem]">
                  <CountUp value={totalPending} format={formatRupiah} />
                </p>
                <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-dc-on-dark/80">
                  {totalPending > 0
                    ? "Sudah dipotong komisi. Admin mentransfer dana ini lalu menandainya sudah ditransfer."
                    : "Belum ada dana yang menunggu transfer. Dana masuk ke sini setelah client menandai acara selesai."}
                </p>
                <div className="relative mt-6 flex items-center justify-between gap-4 border-t border-dc-on-dark/15 pt-4 text-sm">
                  <span className="text-dc-on-dark/80">Total sudah ditransfer</span>
                  <span className="font-bold tabular-nums text-dc-gold-antique">{formatRupiah(totalDisbursed)}</span>
                </div>
              </Card>

              <Card className="flex flex-col p-6 sm:p-7">
                <p className="text-sm font-medium text-dc-text-2">Ditahan escrow</p>
                <p className="mt-1 font-heading text-[2.2rem] font-semibold leading-tight text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                  <CountUp value={held} format={formatRupiah} />
                </p>
                <p className="mt-1 text-sm text-dc-text-3">
                  {heldCount > 0 ? `Dari ${heldCount} booking yang sudah dibayar client, sebelum komisi.` : "Belum ada pembayaran client yang ditahan."}
                </p>
                <div className="mt-auto pt-5">
                  <FundStatus status={heldCount > 0 ? "dp_paid" : "confirmed"} />
                </div>
              </Card>
            </div>

            <section aria-labelledby="riwayat" className="mt-10">
              <h2 id="riwayat" className="mb-3 font-heading text-[1.7rem] leading-tight text-dc-ink">
                Riwayat pencairan
              </h2>
              {history.length === 0 ? (
                <EmptyState
                  title="Belum ada pencairan"
                  body="Setiap booking yang selesai muncul di sini dengan rincian harga, komisi, dan dana bersih."
                  actionHref="/vendor/bookings"
                  actionLabel="Lihat booking"
                />
              ) : (
                <StaggerList>
                  {history.map((p) => {
                    const b = byId.get(p.booking_id);
                    return (
                      <StaggerItem key={p.booking_id}>
                        <Card className="p-5">
                          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                            <div className="min-w-0">
                              <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                              <p className="mt-2 break-words font-semibold text-dc-ink">{b?.package_description || "Booking selesai"}</p>
                              {b && <p className="text-sm text-dc-text-2">Acara {formatTanggal(b.event_date)}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-dc-text-3">Dana bersih</p>
                              <p className="text-xl font-bold tabular-nums text-dc-ink">{formatRupiah(p.net_amount)}</p>
                            </div>
                          </div>
                          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-dc-cream/70 px-4 py-3 text-sm">
                            <div>
                              <dt className="text-xs text-dc-text-3">Harga booking</dt>
                              <dd className="font-semibold tabular-nums text-dc-ink">{formatRupiah(p.gross_amount)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-dc-text-3">Komisi DuaCincin</dt>
                              <dd className="font-semibold tabular-nums text-dc-ink">{formatRupiah(p.commission_amount)}</dd>
                            </div>
                          </dl>
                          <Link
                            href={`/vendor/bookings/${p.booking_id}`}
                            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                          >
                            Buka booking
                          </Link>
                        </Card>
                      </StaggerItem>
                    );
                  })}
                </StaggerList>
              )}
            </section>

            {/* Bank details are not stored in this app: say so plainly and
                point to the team instead of inventing an account card. */}
            <section aria-labelledby="rekening" className="mt-10">
              <Card tone="paper" className="p-6">
                <div className="max-w-xl">
                  <h2 id="rekening" className="font-heading text-2xl text-dc-ink">
                    Rekening tujuan
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-dc-text-2">
                    Admin DuaCincin mentransfer dana bersih ke rekening usahamu, lalu menandainya sudah ditransfer di sini. Data rekening belum bisa dilihat atau diubah dari aplikasi. Kalau rekeningmu berubah, sampaikan ke Admin DuaCincin sebelum pencairan berikutnya.
                  </p>
                </div>
              </Card>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}
