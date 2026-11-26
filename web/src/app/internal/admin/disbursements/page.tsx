"use client";

import { useEffect, useState } from "react";

import { AdmAvatar, AdmConfirm, AdmEmpty, AdmError, AdmHead, AdmList, AdmListItem, AdmRowsSkeleton } from "@/components/admin/admUi";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { CountUp } from "@/components/ui/Motion";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
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
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHead
          kicker="Uang dan sengketa"
          title={
            <>
              Pencairan <em>dana</em> vendor
            </>
          }
          note="Acara sudah dikonfirmasi selesai oleh client. Transfer dana bersih ke vendor, lalu tandai di sini."
        />

        <div className="mt-8">
          {error && !loadFailed && <AdmError message={error} />}

          {loading ? (
            <AdmRowsSkeleton rows={3} label="Memuat pencairan" />
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
            <AdmEmpty art="coin" title="Tidak ada pencairan yang menunggu">
              Booking yang acaranya sudah selesai akan masuk ke sini untuk dicairkan.
            </AdmEmpty>
          ) : (
            <>
              {/* The figure first: the admin needs to know how much to move before row detail. */}
              <section aria-labelledby="total-transfer" className="flex items-center gap-5 rounded-[28px] bg-wd-accent-wash p-6 sm:p-9">
                <div className="min-w-0 flex-1">
                  <h2 id="total-transfer" className="text-sm font-semibold text-wd-accent-ink">
                    Dana menunggu ditransfer
                  </h2>
                  <p className="wd-display mt-1 break-words text-[clamp(2.4rem,7vw,4.2rem)] leading-none tabular-nums">
                    <CountUp value={totalNet} format={formatRupiah} />
                  </p>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-wd-text">
                    <span className="tabular-nums">{items.length}</span> booking, komisi platform <span className="tabular-nums">{formatRupiah(totalCommission)}</span> sudah dipotong.
                  </p>
                </div>
                <span aria-hidden className="hidden h-28 w-28 shrink-0 rounded-3xl bg-white/70 p-4 sm:block">
                  <ClientArt kind="coin" />
                </span>
              </section>

              <h2 className="wd-title mt-10 text-[clamp(1.4rem,2.4vw,1.8rem)] leading-tight">
                Pencairan <em>menunggu</em>
              </h2>
              <div className="mt-3">
                <AdmList label="Pencairan menunggu">
                  {items.map((d) => (
                    <AdmListItem key={d.booking_id}>
                      <article aria-label={`Pencairan untuk ${vendorName(d)}`} className="grid gap-4 px-1 py-5 sm:px-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] md:items-center md:gap-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <AdmAvatar name={vendorName(d)} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-wd-ink">{vendorName(d)}</p>
                            <p className="text-sm text-wd-muted">Booking #{d.booking_id.slice(0, 8)}, sudah lunas</p>
                          </div>
                        </div>

                        <dl className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <dt className="text-xs text-wd-muted">Dibayar client</dt>
                            <dd className="mt-0.5 break-words font-semibold tabular-nums text-wd-ink">{formatRupiah(d.gross_amount)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-wd-muted">Komisi 10%</dt>
                            <dd className="mt-0.5 break-words tabular-nums text-wd-text">- {formatRupiah(d.commission_amount)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-wd-muted">Ditransfer ke vendor</dt>
                            <dd className="mt-0.5 break-words font-bold tabular-nums text-wd-ink">{formatRupiah(d.net_amount)}</dd>
                          </div>
                        </dl>

                        <button
                          type="button"
                          onClick={() => setTarget(d)}
                          disabled={busyId === d.booking_id}
                          className={`${wdButton({ variant: "ink", size: "md", className: "w-full md:w-auto" })} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink`}
                        >
                          {busyId === d.booking_id ? "Memproses..." : "Tandai sudah ditransfer"}
                        </button>
                      </article>
                    </AdmListItem>
                  ))}
                </AdmList>
              </div>
            </>
          )}
        </div>
      </div>

      <AdmConfirm
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={confirmMark}
        busy={!!target && busyId === target.booking_id}
        title="Dana sudah ditransfer?"
        consequence={
          <>
            Tandai hanya setelah <span className="font-semibold text-wd-ink">{target ? formatRupiah(target.net_amount) : ""}</span> benar-benar masuk ke rekening{" "}
            <span className="font-semibold text-wd-ink">{target ? vendorName(target) : ""}</span>. Vendor langsung mendapat notifikasi bahwa dana sudah dicairkan, dan tanda ini tidak bisa dibatalkan dari halaman ini.
          </>
        }
        confirmLabel="Ya, sudah ditransfer"
      />
    </AdminShell>
  );
}
