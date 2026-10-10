"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  formatRupiah,
  type Booking,
  type CurrentUser,
  type Payout,
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

type NextStep = { title: string; body: string; cta: string; href: string };

/** One recommended action, in priority order: finish the storefront, wait for
 * approval, answer new booking requests, then keep it fresh. */
function nextStep(profile: VendorProfile, packages: VendorPackage[], requested: Booking[]): NextStep {
  if (profile.status === "rejected") {
    return { title: "Profilmu perlu diperbaiki", body: profile.rejection_reason || "Admin menolak profilmu. Perbarui datanya lalu kirim ulang.", cta: "Perbarui profil", href: "/vendor/profile" };
  }
  if (requested.length > 0) {
    return {
      title: requested.length === 1 ? "1 permintaan booking menunggu jawabanmu" : `${requested.length} permintaan booking menunggu jawabanmu`,
      body: "Client menunggu konfirmasi tanggal dan paket. Jawaban cepat membantu mereka memutuskan.",
      cta: "Lihat permintaan",
      href: "/vendor/bookings",
    };
  }
  if ((profile.portfolio?.length ?? 0) === 0) {
    return { title: "Tambahkan foto portofolio", body: "Client memilih vendor dari foto lebih dulu. Profil tanpa foto tidak menarik untuk dibuka.", cta: "Unggah foto", href: "/vendor/portfolio" };
  }
  if (packages.length === 0) {
    return { title: "Tambahkan paket harga", body: "Paket membantu client membandingkan pilihan dan harga sebelum mengajak chat.", cta: "Buat paket", href: "/vendor/paket" };
  }
  if (profile.status === "pending") {
    return { title: "Profilmu sedang ditinjau Admin", body: "Etalasemu sudah lengkap. Profil muncul di direktori begitu Admin menyetujuinya.", cta: "Lihat etalase", href: "/vendor/profile" };
  }
  return { title: "Tidak ada yang mendesak", body: "Tidak ada permintaan baru. Perbarui foto atau paket agar etalasemu tetap segar.", cta: "Kelola etalase", href: "/vendor/profile" };
}

function VendorDashboardContent({ user }: { user: CurrentUser }) {
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [dataError, setDataError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    apiGet<VendorProfile>("/api/v1/vendor/profile/me").then(setProfile).catch(() => setProfile(null));
    apiGet<Booking[]>("/api/v1/bookings").then((d) => setBookings(d ?? [])).catch(() => setDataError(true));
    apiGet<Payout[]>("/api/v1/vendor/payouts").then((d) => setPayouts(d ?? [])).catch(() => setDataError(true));
    apiGet<VendorPackage[]>("/api/v1/vendor/packages").then((d) => setPackages(d ?? [])).catch(() => setDataError(true));
  }, [reload]);

  const shell = (children: React.ReactNode) => (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      {children}
    </Shell>
  );

  if (profile === undefined) {
    return shell(
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Memuat dashboard">
        <div className="mb-10 h-14 w-72 animate-pulse rounded-md bg-dc-ink/5" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-dc-ink/5" />
          ))}
        </div>
      </div>,
    );
  }

  if (profile === null) {
    return shell(
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <EmptyState
          title="Lengkapi profil dulu"
          body="Isi profil usahamu supaya dashboard bisa menampilkan data booking, rating, dan pencairan."
          actionHref="/vendor/profile"
          actionLabel="Lengkapi profil"
        />
      </div>,
    );
  }

  const requested = bookings.filter((b) => b.status === "requested");
  const upcoming = bookings
    .filter((b) => ["confirmed", "dp_paid", "full_paid"].includes(b.status))
    .slice()
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4);
  const activeCount = bookings.filter((b) => b.status !== "cancelled" && b.status !== "completed").length;
  const pendingPayout = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.net_amount, 0);
  const next = nextStep(profile, packages, requested);

  const checklist = [
    { done: true, label: "Profil usaha", href: "/vendor/profile" },
    { done: (profile.portfolio?.length ?? 0) > 0, label: `Portofolio (${profile.portfolio?.length ?? 0} foto)`, href: "/vendor/portfolio" },
    { done: packages.length > 0, label: `Paket harga (${packages.length})`, href: "/vendor/paket" },
    { done: profile.status === "approved", label: profile.status === "approved" ? "Disetujui Admin, tampil di direktori" : "Menunggu persetujuan Admin", href: "/vendor/profile" },
  ];

  return shell(
    <>
      <DashboardBanner title="Hari ini" subtitle={profile.business_name} />

      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <section aria-labelledby="langkah-vendor" className="relative -mt-10 mb-8 rounded-lg border border-dc-ink/10 bg-dc-white p-6 sm:-mt-12 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-dc-clay">Langkah berikutnya</p>
              <h2 id="langkah-vendor" className="mt-1 font-heading text-3xl leading-tight text-dc-ink sm:text-4xl">
                {next.title}
              </h2>
              <p className="mt-2 text-dc-black/70">{next.body}</p>
            </div>
            <Link
              href={next.href}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-dc-clay px-7 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
            >
              {next.cta}
            </Link>
          </div>
        </section>

        {dataError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>Sebagian data gagal dimuat.</span>
            <button
              type="button"
              onClick={() => {
                setDataError(false);
                setReload((n) => n + 1);
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-red-300 px-4 font-semibold hover:bg-red-100"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Permintaan baru" value={requested.length} density="structured" accent="clay" />
          <StatTile label="Booking aktif" value={activeCount} density="structured" accent="ink" />
          <StatTile
            label="Rating"
            value={profile.review_count > 0 ? profile.average_rating.toFixed(1) : "-"}
            trend={profile.review_count > 0 ? `${profile.review_count} ulasan` : "Belum ada ulasan"}
            density="structured"
            accent="gold"
            className="col-span-2 lg:col-span-1"
          />
          <StatTile label="Estimasi pencairan" value={formatRupiah(pendingPayout)} trend="menunggu dicairkan Admin" density="structured" accent="gold" className="col-span-2 lg:col-span-1" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section aria-labelledby="acara-mendatang" className="lg:col-span-7">
            <h2 id="acara-mendatang" className="font-heading text-2xl text-dc-ink">
              Acara mendatang
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-dc-ink/20 px-4 py-8 text-center text-sm text-dc-black/70">Belum ada acara yang dikonfirmasi.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/vendor/bookings/${b.id}`}
                      className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                    >
                      <Card className="flex items-start justify-between gap-3 p-4 transition-colors group-hover:border-dc-ink/30">
                        <div className="min-w-0">
                          <p className="break-words font-medium text-dc-ink">{b.package_description || "Booking"}</p>
                          <p className="mt-0.5 text-sm tabular-nums text-dc-black/70">
                            {b.event_date} · {formatRupiah(b.agreed_price)}
                          </p>
                        </div>
                        <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/vendor/bookings" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
              Semua booking
            </Link>
          </section>

          <section aria-labelledby="kelengkapan" className="lg:col-span-5">
            <h2 id="kelengkapan" className="font-heading text-2xl text-dc-ink">
              Kelengkapan etalase
            </h2>
            <Card className="mt-3 divide-y divide-dc-ink/10">
              {checklist.map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="flex min-h-12 items-center gap-3 px-4 py-3 text-sm text-dc-ink transition-colors hover:bg-dc-ivory focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dc-gold"
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                      c.done ? "border-dc-ink bg-dc-ink text-dc-white" : "border-dc-ink/30 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="flex-1">{c.label}</span>
                  <span className="sr-only">{c.done ? "selesai" : "belum selesai"}</span>
                </Link>
              ))}
            </Card>
            {profile.status === "approved" && (
              <Link
                href={`/vendors/${user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
              >
                Lihat tampilan publik (tab baru)
              </Link>
            )}
          </section>
        </div>
      </div>
    </>,
  );
}
