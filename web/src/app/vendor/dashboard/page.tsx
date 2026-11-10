"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { CountUp } from "@/components/ui/Motion";
import { ReviewList, ReviewSummary } from "@/components/vendor/Reviews";
import { BookingRow, BookingRowSkeleton, heldAmount, todayLabel } from "@/components/vendor-ops/ops";
import { StaggerItem, StaggerList } from "@/components/vendor-ops/motion";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  ApiError,
  formatRupiah,
  type Booking,
  type CurrentUser,
  type Payout,
  type Review,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";

export default function VendorDashboardPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorDashboardContent user={user} />}
    </WithUser>
  );
}

type NextStep = { eyebrow: string; title: string; body: string; cta: string; href: string };

/** One recommended action, in priority order: fix a rejected profile, answer
 * new booking requests, then finish the storefront, wait for approval, keep
 * it fresh. A single request links straight to that booking. */
function nextStep(profile: VendorProfile, packages: VendorPackage[], requested: Booking[]): NextStep {
  if (profile.status === "rejected") {
    return { eyebrow: "Perlu diperbaiki", title: "Profilmu perlu diperbaiki", body: profile.rejection_reason || "Admin menolak profilmu. Perbarui datanya lalu kirim ulang.", cta: "Perbarui profil", href: "/vendor/profile" };
  }
  if (requested.length > 0) {
    return {
      eyebrow: "Paling penting sekarang",
      title: requested.length === 1 ? "Satu client menunggu jawabanmu" : `${requested.length} client menunggu jawabanmu`,
      body: "Terima atau tolak permintaan booking. Jawaban cepat membantu client mengunci tanggalnya.",
      cta: requested.length === 1 ? "Jawab permintaan" : "Lihat permintaan",
      href: requested.length === 1 ? `/vendor/bookings/${requested[0].id}` : "/vendor/bookings",
    };
  }
  if ((profile.portfolio?.length ?? 0) === 0) {
    return { eyebrow: "Lengkapi etalase", title: "Tambahkan foto portofolio", body: "Client memilih vendor dari foto lebih dulu. Profil tanpa foto jarang dibuka.", cta: "Unggah foto", href: "/vendor/portfolio" };
  }
  if (packages.length === 0) {
    return { eyebrow: "Lengkapi etalase", title: "Tambahkan paket harga", body: "Paket membantu client membandingkan pilihan dan harga sebelum mengajak chat.", cta: "Buat paket", href: "/vendor/paket" };
  }
  if (profile.status === "pending") {
    return { eyebrow: "Sedang ditinjau", title: "Profilmu sedang ditinjau Admin", body: "Etalasemu sudah lengkap. Profil muncul di direktori begitu Admin menyetujuinya.", cta: "Lihat etalase", href: "/vendor/profile" };
  }
  return { eyebrow: "Semua beres", title: "Tidak ada yang mendesak", body: "Tidak ada permintaan baru. Perbarui foto atau paket agar etalasemu tetap segar.", cta: "Kelola etalase", href: "/vendor/profile" };
}

function VendorDashboardContent({ user }: { user: CurrentUser }) {
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dataError, setDataError] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then((p) => {
        setProfileFailed(false);
        setProfile(p);
      })
      // 404 = no profile yet (show the setup prompt); anything else is a load failure.
      .catch((err) => (err instanceof ApiError && err.status === 404 ? setProfile(null) : setProfileFailed(true)));
    apiGet<Booking[]>("/api/v1/bookings").then((d) => setBookings(d ?? [])).catch(() => setDataError(true));
    apiGet<Payout[]>("/api/v1/vendor/payouts").then((d) => setPayouts(d ?? [])).catch(() => setDataError(true));
    apiGet<VendorPackage[]>("/api/v1/vendor/packages").then((d) => setPackages(d ?? [])).catch(() => setDataError(true));
    // The public reviews endpoint, scoped to the vendor's own id: reviews are
    // public by design, so the vendor sees exactly what clients see.
    apiGet<Review[]>(`/api/v1/vendors/${user.id}/reviews`).then((d) => setReviews(d ?? [])).catch(() => {});
  }, [reload, user.id]);

  const shell = (children: React.ReactNode) => (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      {children}
    </Shell>
  );

  if (profile === undefined && profileFailed) {
    return shell(
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <ErrorState
          title="Halaman ini belum bisa dimuat"
          body="Periksa koneksi internetmu, lalu coba lagi."
          onRetry={() => {
            setProfileFailed(false);
            setDataError(false);
            setReload((n) => n + 1);
          }}
        />
      </div>,
    );
  }

  if (profile === undefined) {
    return shell(
      <>
        <DashboardBanner title="Hari ini" subtitle={todayLabel()} />
        <SkeletonGroup label="Memuat dashboard" className="mx-auto max-w-6xl px-4 sm:px-6">
          <Skeleton className="relative -mt-10 h-44 rounded-2xl sm:-mt-12" />
          <div className="mt-8 grid gap-3">
            <BookingRowSkeleton />
            <BookingRowSkeleton />
          </div>
        </SkeletonGroup>
      </>,
    );
  }

  if (profile === null) {
    return shell(
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <EmptyState
          title="Lengkapi profil dulu"
          body="Isi profil usahamu supaya halaman ini bisa menampilkan booking, ulasan, dan pencairan."
          actionHref="/vendor/profile"
          actionLabel="Lengkapi profil"
        />
      </div>,
    );
  }

  const list = bookings ?? [];
  const requested = list.filter((b) => b.status === "requested").sort((a, b) => a.event_date.localeCompare(b.event_date));
  const upcoming = list
    .filter((b) => ["confirmed", "dp_paid", "full_paid"].includes(b.status))
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3);
  const held = list.reduce((sum, b) => sum + heldAmount(b), 0);
  const ready = (payouts ?? []).filter((p) => p.status === "pending").reduce((sum, p) => sum + p.net_amount, 0);
  const next = nextStep(profile, packages, requested);
  const urgent = requested.length > 0 || profile.status === "rejected";

  const checklist = [
    { done: (profile.portfolio?.length ?? 0) > 0, label: "Foto portofolio", detail: `${profile.portfolio?.length ?? 0} foto`, href: "/vendor/portfolio" },
    { done: packages.length > 0, label: "Paket harga", detail: `${packages.length} paket`, href: "/vendor/paket" },
    { done: profile.status === "approved", label: "Disetujui Admin", detail: profile.status === "approved" ? "Tampil di direktori" : "Menunggu persetujuan", href: "/vendor/profile" },
  ];
  const storefrontDone = checklist.every((c) => c.done);
  const retry = () => {
    setDataError(false);
    setReload((n) => n + 1);
  };

  return shell(
    <>
      <DashboardBanner
        eyebrow={profile.business_name}
        title={
          <>
            Hari <span className="dc-em-light">ini</span>
          </>
        }
        subtitle={todayLabel()}
      />

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        {/* The one focal point: the single most useful thing to do now. */}
        <section
          aria-labelledby="langkah-vendor"
          className={`animate-fade-up relative -mt-10 mb-10 rounded-2xl border bg-dc-white p-6 shadow-lift sm:-mt-12 sm:p-8 ${urgent ? "border-dc-gold/70" : "border-dc-line"}`}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="dc-eyebrow">{next.eyebrow}</p>
              <h2 id="langkah-vendor" className="mt-2 font-heading text-[2rem] leading-[1.08] text-dc-ink sm:text-[2.6rem]">
                {next.title}
              </h2>
              <p className="mt-2 leading-relaxed text-dc-text-2">{next.body}</p>
            </div>
            <ButtonLink href={next.href} variant={urgent ? "gold" : "primary"} size="lg" className="w-full shrink-0 md:w-auto">
              {next.cta}
            </ButtonLink>
          </div>
        </section>

        {dataError && (
          <div className="mb-8">
            <ErrorState compact title="Sebagian data belum termuat" body="Booking atau pencairan belum bisa ditampilkan. Periksa koneksimu." onRetry={retry} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-10 lg:col-span-7">
            {/* Requests first: they are the only thing that expires if ignored. */}
            <section aria-labelledby="permintaan-baru">
              <SectionHead id="permintaan-baru" title="Permintaan baru" count={bookings ? requested.length : undefined} href={requested.length > 2 ? "/vendor/bookings" : undefined} />
              {bookings === null && !dataError ? (
                <div className="grid gap-3">
                  <BookingRowSkeleton />
                </div>
              ) : requested.length === 0 ? (
                <p className="rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-5 py-6 text-sm leading-relaxed text-dc-text-2">
                  Belum ada permintaan baru. Permintaan booking dari client muncul di sini lebih dulu.
                </p>
              ) : (
                <StaggerList>
                  {requested.slice(0, 2).map((b) => (
                    <StaggerItem key={b.id}>
                      <BookingRow booking={b} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </section>

            <section aria-labelledby="acara-terdekat">
              <SectionHead id="acara-terdekat" title="Acara terdekat" href="/vendor/bookings" linkLabel="Semua booking" />
              {bookings === null && !dataError ? (
                <div className="grid gap-3">
                  <BookingRowSkeleton />
                  <BookingRowSkeleton />
                </div>
              ) : upcoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-5 py-6 text-sm leading-relaxed text-dc-text-2">
                  Belum ada acara yang dikonfirmasi. Booking yang sudah kamu terima akan muncul di sini, urut dari yang paling dekat.
                </p>
              ) : (
                <StaggerList>
                  {upcoming.map((b) => (
                    <StaggerItem key={b.id}>
                      <BookingRow booking={b} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-10 lg:col-span-5">
            {/* Money: what is ready to be transferred vs what escrow still holds. */}
            <section aria-labelledby="uang-vendor">
              <SectionHead id="uang-vendor" title="Pencairan" href="/vendor/payouts" linkLabel="Rincian" />
              <Card className="overflow-hidden p-0">
                {payouts === null && bookings === null && !dataError ? (
                  <SkeletonGroup label="Memuat pencairan" className="p-6">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-3 h-10 w-48" />
                  </SkeletonGroup>
                ) : (
                  <>
                    <div className="p-6">
                      <p className="text-sm font-medium text-dc-text-2">Siap dicairkan Admin</p>
                      <p className="mt-1 font-heading text-[2.4rem] font-semibold leading-tight text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                        <CountUp value={ready} format={formatRupiah} />
                      </p>
                      <p className="mt-1 text-sm text-dc-text-3">{ready > 0 ? "Sudah dipotong komisi, ditransfer Admin ke rekeningmu." : "Muncul setelah client menandai acara selesai."}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-dc-line bg-dc-cream/60 px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-dc-text-2">Ditahan escrow</p>
                        <p className="text-xs text-dc-text-3">Dibayar client, menunggu acara selesai</p>
                      </div>
                      <p className="shrink-0 text-lg font-bold tabular-nums text-dc-ink">{formatRupiah(held)}</p>
                    </div>
                  </>
                )}
              </Card>
            </section>

            <section aria-labelledby="ulasan-vendor">
              <SectionHead
                id="ulasan-vendor"
                title="Ulasan terbaru"
                href={profile.status === "approved" ? `/vendors/${user.id}` : undefined}
                linkLabel="Halaman publik"
              />
              {reviews.length === 0 ? (
                <p className="rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-5 py-6 text-sm leading-relaxed text-dc-text-2">
                  Belum ada ulasan. Client bisa memberi ulasan setelah acaranya selesai.
                </p>
              ) : (
                <>
                  <ReviewSummary reviews={reviews} />
                  <div className="mt-4">
                    <ReviewList reviews={reviews.slice(0, 2)} />
                  </div>
                  {reviews.length > 2 && <p className="mt-2 text-sm text-dc-text-3">Menampilkan 2 dari {reviews.length} ulasan.</p>}
                </>
              )}
            </section>

            {!storefrontDone && (
              <section aria-labelledby="kelengkapan">
                <SectionHead id="kelengkapan" title="Kelengkapan etalase" />
                <Card className="divide-y divide-dc-line p-0">
                  {checklist.map((c) => (
                    <Link
                      key={c.label}
                      href={c.href}
                      className="flex min-h-14 items-center gap-3 px-5 py-3 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-dc-ivory focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dc-gold"
                    >
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${c.done ? "border-dc-success bg-dc-success text-dc-white" : "border-dc-line-strong"}`}
                      >
                        {c.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 font-medium text-dc-ink">{c.label}</span>
                      <span className="text-dc-text-3">{c.detail}</span>
                      <span className="sr-only">{c.done ? ", selesai" : ", belum selesai"}</span>
                    </Link>
                  ))}
                </Card>
              </section>
            )}
          </div>
        </div>
      </div>
    </>,
  );
}

function SectionHead({ id, title, count, href, linkLabel = "Lihat semua" }: { id: string; title: string; count?: number; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="flex items-baseline gap-2 font-heading text-[1.7rem] leading-tight text-dc-ink">
        {title}
        {count !== undefined && count > 0 && (
          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-dc-gold/20 px-2 py-0.5 font-sans text-sm font-bold text-dc-clay tabular-nums">{count}</span>
        )}
      </h2>
      {href && (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
