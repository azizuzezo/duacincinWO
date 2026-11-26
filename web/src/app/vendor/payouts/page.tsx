"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { CountUp } from "@/components/ui/Motion";
import { formatTanggal, heldAmount } from "@/components/vendor-ops/ops";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  ApiError,
  formatRupiah,
  type Booking,
  type CurrentUser,
  type Payout,
} from "@/lib/api";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

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
  const pending = payouts.filter((p) => p.status === "pending");
  const done = payouts.filter((p) => p.status !== "pending");
  const groups = [
    { id: "grup-menunggu", title: "Menunggu ditransfer", items: pending },
    { id: "grup-selesai", title: "Sudah ditransfer", items: done },
  ].filter((g) => g.items.length > 0);

  function row(p: Payout) {
    const b = byId.get(p.booking_id);
    return (
      <li key={p.booking_id} className="border-b border-wd-line">
        <Link href={`/vendor/bookings/${p.booking_id}`} className={`group flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-1 py-4 transition-colors hover:bg-wd-paper sm:px-3 ${FOCUS} focus-visible:-outline-offset-2`}>
          <div className="min-w-0">
            <p className="break-words font-semibold text-wd-ink">{b?.package_description || "Booking selesai"}</p>
            <p className="mt-0.5 text-sm text-wd-text">
              {b ? `Acara ${formatTanggal(b.event_date)}. ` : ""}
              Harga {formatRupiah(p.gross_amount)}, komisi {formatRupiah(p.commission_amount)}.
            </p>
            <p className={`mt-1 text-sm font-semibold ${p.status === "disbursed" ? "text-wd-ok" : "text-wd-accent-ink"}`}>{STATUS_LABEL[p.status] ?? p.status}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-wd-muted">Dana bersih</p>
            <p className="text-lg font-bold tabular-nums text-wd-ink">{formatRupiah(p.net_amount)}</p>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <p className="wd-kicker">Pencairan</p>
        <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
          Uang <em>usahamu</em>
        </h1>
        <p className="mt-2 max-w-xl text-wd-text">Dana dari client ditahan Dana Aman sampai acara selesai, lalu diteruskan ke kamu setelah dipotong komisi.</p>

        <div className="mt-8">
          {loading ? (
            <SkeletonGroup label="Memuat pencairan" className="grid gap-6">
              <Skeleton className="h-44 rounded-[28px]" />
              <Skeleton className="h-24 rounded-2xl" />
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
              {/* One big figure: what is ready to be transferred to the vendor. */}
              <section aria-labelledby="siap-cair" className="animate-fade-up flex items-center gap-5 rounded-[28px] bg-wd-accent-wash p-6 sm:p-9">
                <div className="min-w-0 flex-1">
                  <h2 id="siap-cair" className="text-sm font-semibold text-wd-accent-ink">
                    Siap ditransfer ke kamu
                  </h2>
                  <p className="wd-display mt-1 break-words text-[clamp(2.4rem,7vw,4.2rem)] leading-none tabular-nums">
                    <CountUp value={totalPending} format={formatRupiah} />
                  </p>
                  <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-wd-text">
                    {totalPending > 0
                      ? "Sudah dipotong komisi. Admin mentransfer dana ini lalu menandainya sudah ditransfer."
                      : "Belum ada dana yang menunggu transfer. Dana masuk ke sini setelah client menandai acara selesai."}
                  </p>
                </div>
                <span aria-hidden className="hidden h-28 w-28 shrink-0 rounded-3xl bg-white/70 p-4 sm:block">
                  <ClientArt kind="coin" />
                </span>
              </section>

              <dl className="mt-2 grid gap-x-10 sm:grid-cols-2 sm:divide-x sm:divide-wd-line">
                <div className="border-b border-wd-line py-5 sm:border-b-0 sm:pr-8">
                  <dt className="text-sm font-semibold text-wd-text">Ditahan Dana Aman</dt>
                  <dd className="wd-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] leading-tight tabular-nums">
                    <CountUp value={held} format={formatRupiah} />
                  </dd>
                  <dd className="mt-0.5 text-sm text-wd-muted">{heldCount > 0 ? `Dari ${heldCount} booking yang sudah dibayar client, sebelum komisi.` : "Belum ada pembayaran client yang ditahan."}</dd>
                </div>
                <div className="py-5 sm:pl-8">
                  <dt className="text-sm font-semibold text-wd-text">Total sudah ditransfer</dt>
                  <dd className="wd-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] leading-tight tabular-nums">{formatRupiah(totalDisbursed)}</dd>
                  <dd className="mt-0.5 text-sm text-wd-muted">Dana bersih yang sudah masuk ke rekeningmu.</dd>
                </div>
              </dl>

              <section aria-labelledby="riwayat" className="mt-10">
                <h2 id="riwayat" className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
                  Riwayat <em>pencairan</em>
                </h2>
                {payouts.length === 0 ? (
                  <div className="mt-4 flex flex-col items-start gap-4 border-t border-wd-line py-6 sm:flex-row sm:items-center">
                    <span aria-hidden className="h-16 w-16 shrink-0 rounded-2xl bg-wd-accent-wash p-3">
                      <ClientArt kind="clipboard" />
                    </span>
                    <div>
                      <p className="max-w-md text-[0.95rem] leading-relaxed text-wd-text">Belum ada pencairan. Setiap booking yang selesai muncul di sini dengan rincian harga, komisi, dan dana bersih.</p>
                      <Link href="/vendor/bookings" className={`${wdButton({ variant: "outline", size: "sm", className: "mt-3" })} ${FOCUS}`}>
                        Lihat booking
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-8">
                    {groups.map((g) => (
                      <div key={g.id}>
                        <h3 id={g.id} className="mb-1 text-sm font-semibold text-wd-text">
                          {g.title} <span className="tabular-nums text-wd-muted">({g.items.length})</span>
                        </h3>
                        <ul aria-labelledby={g.id} className="border-t border-wd-line">
                          {g.items.map(row)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Bank details are not stored in this app: say so plainly. */}
              <section aria-labelledby="rekening" className="mt-12 border-t border-wd-line pt-6">
                <h2 id="rekening" className="wd-title text-[1.4rem] leading-tight">
                  Rekening <em>tujuan</em>
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-wd-text">
                  Admin DuaCincin mentransfer dana bersih ke rekening usahamu, lalu menandainya sudah ditransfer di sini. Data rekening belum bisa dilihat atau diubah dari aplikasi. Kalau rekeningmu berubah, sampaikan ke Admin DuaCincin sebelum pencairan berikutnya.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </VendorShell>
  );
}
