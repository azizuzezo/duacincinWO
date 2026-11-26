"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { CountUp } from "@/components/ui/Motion";
import { ReviewList, ReviewSummary } from "@/components/vendor/Reviews";
import { BookingRow, BookingRowSkeleton, heldAmount, todayLabel } from "@/components/vendor-ops/ops";
import { StaggerItem, StaggerList } from "@/components/vendor-ops/motion";
import { FOCUS } from "@/app/client/_ui";
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
    <Shell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
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
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <p className="wd-kicker">Vendor</p>
        <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
          Hari <em>ini</em>
        </h1>
        <p className="mt-2 text-wd-text">{todayLabel()}</p>
        <SkeletonGroup label="Memuat dashboard" className="mt-8">
          <Skeleton className="h-36 rounded-[28px]" />
          <div className="mt-8">
            <BookingRowSkeleton />
            <BookingRowSkeleton />
          </div>
        </SkeletonGroup>
      </div>,
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
  const confirmedCount = list.filter((b) => ["confirmed", "dp_paid", "full_paid"].includes(b.status)).length;
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

  const art: ArtKind = profile.status === "rejected" ? "clipboard" : requested.length > 0 ? "envelope" : storefrontDone ? "shop" : "frame";
  const statusChip =
    profile.status === "approved"
      ? { label: "Tampil di direktori", cls: "bg-wd-accent-soft text-wd-accent-ink" }
      : profile.status === "rejected"
        ? { label: "Perlu diperbaiki", cls: "bg-[#f8e6e1] text-wd-danger" }
        : { label: "Menunggu persetujuan", cls: "bg-wd-blush text-wd-text" };

  return shell(
    <div className="wd-container pb-16 pt-8 sm:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="wd-kicker">{profile.business_name}</p>
          <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
            Hari <em>ini</em>
          </h1>
          <p className="mt-2 text-wd-text">{todayLabel()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold ${statusChip.cls}`}>{statusChip.label}</span>
          {profile.status === "approved" && (
            <Link href={`/vendors/${user.id}`} className={`inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
              Lihat halaman publik
            </Link>
          )}
        </div>
      </header>

      {/* The one focal point: the single most useful thing to do now. */}
      <section aria-labelledby="langkah-vendor" className={`mt-8 grid items-center gap-5 rounded-[28px] bg-wd-accent-wash p-6 sm:grid-cols-[84px_minmax(0,1fr)_auto] sm:gap-7 sm:p-8 ${urgent ? "border-2 border-dashed border-wd-accent" : ""}`}>
        <div className="hidden h-[84px] w-[84px] sm:block">
          <ClientArt kind={art} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-wd-accent-ink">{next.eyebrow}</p>
          <h2 id="langkah-vendor" className="wd-display mt-1 text-[clamp(1.6rem,2.8vw,2.2rem)] leading-tight">
            {next.title}
          </h2>
          <p className="mt-1.5 max-w-xl leading-relaxed text-wd-text">{next.body}</p>
        </div>
        <Link href={next.href} className={`${wdButton({ variant: urgent ? "gold" : "ink", size: "lg" })} ${FOCUS} w-full sm:w-auto`}>
          {next.cta}
        </Link>
      </section>

      {dataError && (
        <div className="mt-8">
          <ErrorState compact title="Sebagian data belum termuat" body="Booking atau pencairan belum bisa ditampilkan. Periksa koneksimu." onRetry={retry} />
        </div>
      )}

      {/* Four plain figures: what needs an answer, what is coming, and the money. */}
      <section aria-label="Ringkasan" className="mt-10">
        <dl className="grid grid-cols-2 gap-y-6 border-t border-wd-line pt-6 lg:grid-cols-4 lg:divide-x lg:divide-wd-line">
          <Figure label="Permintaan baru" value={bookings ? <CountUp value={requested.length} /> : "-"} note="menunggu jawabanmu" />
          <Figure label="Acara dikonfirmasi" value={bookings ? <CountUp value={confirmedCount} /> : "-"} note="sudah kamu terima" />
          <Figure label="Siap dicairkan" value={payouts ? <CountUp value={ready} format={formatRupiah} /> : "-"} note={ready > 0 ? "sudah dipotong komisi" : "muncul setelah acara selesai"} href="/vendor/payouts" />
          <Figure label="Ditahan Dana Aman" value={bookings ? <CountUp value={held} format={formatRupiah} /> : "-"} note="dibayar client, menunggu acara" />
        </dl>
      </section>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="flex flex-col gap-12 lg:col-span-7">
          {/* Requests first: they are the only thing that expires if ignored. */}
          <section aria-labelledby="permintaan-baru">
            <SectionHead id="permintaan-baru" title="Permintaan" em="baru" count={bookings ? requested.length : undefined} href={requested.length > 2 ? "/vendor/bookings" : undefined} />
            {bookings === null && !dataError ? (
              <div className="border-t border-wd-line">
                <BookingRowSkeleton />
              </div>
            ) : requested.length === 0 ? (
              <Empty art="envelope">Belum ada permintaan baru. Permintaan booking dari client muncul di sini lebih dulu.</Empty>
            ) : (
              <StaggerList className="border-t border-wd-line">
                {requested.slice(0, 2).map((b) => (
                  <StaggerItem key={b.id}>
                    <BookingRow booking={b} />
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </section>

          <section aria-labelledby="acara-terdekat">
            <SectionHead id="acara-terdekat" title="Acara" em="terdekat" href="/vendor/bookings" linkLabel="Semua booking" />
            {bookings === null && !dataError ? (
              <div className="border-t border-wd-line">
                <BookingRowSkeleton />
                <BookingRowSkeleton />
              </div>
            ) : upcoming.length === 0 ? (
              <Empty art="clipboard">Belum ada acara yang dikonfirmasi. Booking yang sudah kamu terima akan muncul di sini, urut dari yang paling dekat.</Empty>
            ) : (
              <StaggerList className="border-t border-wd-line">
                {upcoming.map((b) => (
                  <StaggerItem key={b.id}>
                    <BookingRow booking={b} />
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-12 lg:col-span-5">
          <section aria-labelledby="ulasan-vendor">
            <SectionHead id="ulasan-vendor" title="Ulasan" em="terbaru" />
            {reviews.length === 0 ? (
              <Empty art="people">Belum ada ulasan. Client bisa memberi ulasan setelah acaranya selesai.</Empty>
            ) : (
              <>
                <ReviewSummary reviews={reviews} />
                <div className="mt-4">
                  <ReviewList reviews={reviews.slice(0, 2)} />
                </div>
                {reviews.length > 2 && <p className="mt-2 text-sm text-wd-muted">Menampilkan 2 dari {reviews.length} ulasan.</p>}
              </>
            )}
          </section>

          {!storefrontDone && (
            <section aria-labelledby="kelengkapan">
              <SectionHead id="kelengkapan" title="Kelengkapan" em="etalase" />
              <ul className="border-t border-wd-line">
                {checklist.map((c) => (
                  <li key={c.label}>
                    <Link href={c.href} className={`flex min-h-14 items-center gap-3 border-b border-wd-line px-1 py-3 text-sm transition-colors hover:bg-wd-paper ${FOCUS}`}>
                      <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${c.done ? "border-wd-ok bg-wd-ok text-white" : "border-wd-line-2"}`}>
                        {c.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 font-semibold text-wd-ink">{c.label}</span>
                      <span className="text-wd-muted">{c.detail}</span>
                      <span className="sr-only">{c.done ? ", selesai" : ", belum selesai"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>,
  );
}

function Figure({ label, value, note, href }: { label: string; value: React.ReactNode; note: string; href?: string }) {
  return (
    <div className="px-0 lg:px-6 lg:first:pl-0">
      <dt className="text-sm font-semibold text-wd-text">
        {href ? (
          <Link href={href} className={`underline-offset-4 hover:underline ${FOCUS}`}>
            {label}
          </Link>
        ) : (
          label
        )}
      </dt>
      <dd className="wd-display mt-1 break-words text-[clamp(1.6rem,2.6vw,2.2rem)] leading-tight tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-sm text-wd-muted">{note}</dd>
    </div>
  );
}

/** An empty list: a small character and one honest sentence, no dashed box. */
function Empty({ art, children }: { art: ArtKind; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-wd-line py-5">
      <span aria-hidden className="h-14 w-14 shrink-0 rounded-2xl bg-wd-accent-wash p-2.5">
        <ClientArt kind={art} />
      </span>
      <p className="text-sm leading-relaxed text-wd-text">{children}</p>
    </div>
  );
}

function SectionHead({ id, title, em, count, href, linkLabel = "Lihat semua" }: { id: string; title: string; em?: string; count?: number; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="wd-title flex items-baseline gap-2 text-[clamp(1.4rem,2.2vw,1.8rem)] leading-tight">
        <span>
          {title}
          {em && (
            <>
              {" "}
              <em>{em}</em>
            </>
          )}
        </span>
        {count !== undefined && count > 0 && <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-wd-accent px-2 py-0.5 font-sans text-sm font-bold text-wd-ink tabular-nums">{count}</span>}
      </h2>
      {href && (
        <Link href={href} className={`inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
