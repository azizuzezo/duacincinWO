"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { CountUp } from "@/components/ui/Motion";
import { ReviewList, ReviewSummary } from "@/components/vendor/Reviews";
import { BookingRowSkeleton, heldAmount, todayLabel } from "@/components/vendor-ops/ops";
import { MiniCalendar } from "@/components/vendor-ops/MiniCalendar";
import { RequestInbox } from "@/components/vendor-ops/RequestInbox";
import { Storefront } from "@/components/vendor-ops/Storefront";
import { FOCUS } from "@/app/client/_ui";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  ApiError,
  formatRupiah,
  type Booking,
  type BookingStatus,
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
    return { eyebrow: "Perlu diperbaiki", title: "Profilmu perlu diperbaiki", body: `${profile.rejection_reason ? `Catatan tim: ${profile.rejection_reason}. ` : ""}Perbaiki datanya lalu ajukan ulang supaya ditinjau lagi.`, cta: "Perbaiki dan ajukan ulang", href: "/vendor/profile" };
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
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      {children}
    </VendorShell>
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
    const first = (user.full_name || "").trim().split(/\s+/)[0];
    const steps = [
      { title: "Isi profil usaha", body: "Nama usaha, kategori, kota layanan, harga mulai dari, dan cerita singkat usahamu.", href: "/vendor/profile" },
      { title: "Tambah foto portofolio", body: "Minimal 3 foto hasil kerja. Calon pengantin memilih vendor dari foto lebih dulu.", href: "/vendor/portfolio" },
      { title: "Buat paket harga", body: "Minimal 1 paket supaya client bisa membandingkan pilihan sebelum chat.", href: "/vendor/paket" },
      { title: "Tim DuaCincin meninjau", body: "Setelah disetujui, etalasemu tampil di direktori dan bisa menerima booking.", href: undefined },
    ];
    return shell(
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <section aria-labelledby="selamat-datang" className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-14">
          <div>
            <p className="wd-kicker">{first ? `Selamat datang, ${first}` : "Selamat datang"}</p>
            <h1 id="selamat-datang" className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
              Buka <em>tokomu</em> di DuaCincin
            </h1>
            <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-wd-text">Empat langkah sampai usahamu tampil di direktori dan siap menerima booking. Dana dari client ditahan lewat Dana Aman sampai acara selesai.</p>
            <ol className="mt-7 max-w-2xl border-t border-wd-line">
              {steps.map((st, i) => (
                <li key={st.title} className="flex items-start gap-4 border-b border-wd-line py-4">
                  <span aria-hidden className="wd-display w-6 shrink-0 text-[1.6rem] italic leading-none text-wd-accent-ink">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    {st.href ? (
                      <Link href={st.href} className={`font-semibold text-wd-ink underline-offset-4 hover:underline ${FOCUS}`}>
                        {st.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-wd-ink">{st.title}</span>
                    )}
                    <span className="mt-0.5 block text-[0.93rem] leading-relaxed text-wd-text">{st.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/vendor/profile" className={`${wdButton({ variant: "gold", size: "lg" })} ${FOCUS} mt-7`}>
              Mulai dari profil usaha
            </Link>
          </div>
          <div aria-hidden className="hidden aspect-square w-full max-w-[220px] justify-self-center rounded-[28px] bg-wd-accent-wash p-8 lg:block">
            <ClientArt kind="shop" />
          </div>
        </section>
      </div>,
    );
  }

  const list = bookings ?? [];
  const setStatus = (id: string, status: BookingStatus) => setBookings((cur) => (cur ?? []).map((b) => (b.id === id ? { ...b, status } : b)));
  const requested = list.filter((b) => b.status === "requested").sort((a, b) => a.event_date.localeCompare(b.event_date));
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
  const tiles: { href: string; label: string; note: string; art: ArtKind; tone: string }[] = [
    { href: "/vendor/portfolio", label: "Foto portofolio", note: `${profile.portfolio?.length ?? 0} foto`, art: "frame", tone: "bg-wd-accent-wash hover:bg-wd-accent-soft" },
    { href: "/vendor/paket", label: "Paket harga", note: `${packages.length} paket`, art: "card", tone: "bg-wd-paper hover:bg-wd-blush" },
    { href: "/vendor/messages", label: "Pesan", note: "Balas calon client", art: "bubble", tone: "bg-wd-paper hover:bg-wd-blush" },
    { href: "/vendor/payouts", label: "Pencairan", note: ready > 0 ? "Ada yang siap cair" : "Riwayat dan rincian", art: "coin", tone: "bg-wd-accent-wash hover:bg-wd-accent-soft" },
  ];
  const retry = () => {
    setDataError(false);
    setReload((n) => n + 1);
  };

  const greeting = (user.full_name || "").trim().split(/\s+/)[0];

  return shell(
    <div className="wd-container pb-16 pt-6 sm:pt-8">
      <Storefront profile={profile} userId={user.id} />

      {/* The one next step, as a calm strip. Requests live in the inbox below. */}
      <section aria-labelledby="langkah-vendor" className={`mt-5 flex flex-col gap-4 rounded-[24px] bg-wd-accent-wash p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 ${urgent ? "ring-2 ring-wd-accent" : ""}`}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-wd-accent-ink">{greeting ? `Halo, ${greeting}. ${next.eyebrow}` : next.eyebrow}</p>
          <h2 id="langkah-vendor" className="wd-display mt-0.5 text-[clamp(1.3rem,2.2vw,1.7rem)] leading-tight">
            {next.title}
          </h2>
          <p className="mt-1 max-w-2xl text-[0.95rem] leading-relaxed text-wd-text">{next.body}</p>
        </div>
        <Link href={next.href} className={`${wdButton({ variant: urgent ? "gold" : "ink", size: "md" })} ${FOCUS} shrink-0`}>
          {next.cta}
        </Link>
      </section>

      {dataError && (
        <div className="mt-6">
          <ErrorState compact title="Sebagian data belum termuat" body="Booking atau pencairan belum bisa ditampilkan. Periksa koneksimu." onRetry={retry} />
        </div>
      )}

      <section aria-label="Ringkasan" className="mt-8">
        <dl className="grid grid-cols-2 gap-y-6 lg:grid-cols-4 lg:divide-x lg:divide-wd-line">
          <Figure label="Permintaan baru" value={bookings ? <CountUp value={requested.length} /> : "-"} note="menunggu jawabanmu" />
          <Figure label="Acara dikonfirmasi" value={bookings ? <CountUp value={confirmedCount} /> : "-"} note={todayLabel()} />
          <Figure label="Siap dicairkan" value={payouts ? <CountUp value={ready} format={formatRupiah} /> : "-"} note={ready > 0 ? "sudah dipotong komisi" : "muncul setelah acara selesai"} href="/vendor/payouts" />
          <Figure label="Ditahan Dana Aman" value={bookings ? <CountUp value={held} format={formatRupiah} /> : "-"} note="dibayar client, menunggu acara" />
        </dl>
      </section>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="flex flex-col gap-12 lg:col-span-7">
          <section aria-labelledby="kotak-masuk">
            <SectionHead id="kotak-masuk" title="Kotak masuk" em="booking" href="/vendor/bookings" linkLabel="Semua booking" />
            {bookings === null && !dataError ? (
              <div className="border-t border-wd-line">
                <BookingRowSkeleton />
                <BookingRowSkeleton />
              </div>
            ) : (
              <RequestInbox bookings={list} onStatus={setStatus} />
            )}
          </section>

          <section aria-labelledby="ulasan-vendor">
            <SectionHead id="ulasan-vendor" title="Ulasan" em="terbaru" href={profile.status === "approved" ? `/vendors/${user.id}` : undefined} linkLabel="Halaman publik" />
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
        </div>

        <div className="flex flex-col gap-12 lg:col-span-5">
          <section aria-labelledby="kalender-mini">
            <SectionHead id="kalender-mini" title="Kalender" em="tokomu" />
            <div className="rounded-[24px] bg-wd-paper p-4 sm:p-5">
              <MiniCalendar />
            </div>
          </section>

          <section aria-labelledby="kelola-toko">
            <SectionHead id="kelola-toko" title="Kelola" em="toko" />
            <ul className="grid grid-cols-2 gap-3">
              {tiles.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className={`group flex h-full flex-col gap-3 rounded-[22px] p-4 transition-[background-color,transform] duration-200 motion-safe:hover:-translate-y-0.5 ${t.tone} ${FOCUS}`}>
                    <span aria-hidden className="h-12 w-12 transition-transform duration-300 motion-safe:group-hover:-rotate-3 motion-safe:group-hover:scale-105">
                      <ClientArt kind={t.art} />
                    </span>
                    <span>
                      <span className="block font-semibold text-wd-ink">{t.label}</span>
                      <span className="block text-[0.82rem] text-wd-text">{t.note}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
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
