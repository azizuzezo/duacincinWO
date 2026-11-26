import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SectionHead, wdButton } from "@/components/home/ui";
import { PublicShell } from "@/components/landing/PublicShell";
import {
  JoinPath,
  type JoinStep,
} from "@/components/public/untuk-vendor/JoinPath";
import { VendorHero } from "@/components/public/untuk-vendor/VendorHero";
import { VendorPerks } from "@/components/public/untuk-vendor/VendorPerks";
import { PayoutCalculator } from "@/components/public/untuk-vendor/PayoutCalculator";
import {
  VendorShowcase,
  type ShowcaseItem,
} from "@/components/public/untuk-vendor/VendorShowcase";
import { Reveal } from "@/components/landing/Reveal";
import { LIFT, ZOOM } from "@/components/public/shared/styles";
import { artFor } from "@/components/vendor/directory/categoryArt";
import { VENDOR_CATEGORIES } from "@/lib/api";

export const metadata: Metadata = {
  title: "Untuk vendor: terima booking dan pembayaran lewat Dana Aman",
  description:
    "Daftarkan profil dan portofolio usaha pernikahanmu di DuaCincin, terima booking lewat chat, dan terima pembayaran setelah acara selesai dikonfirmasi.",
  alternates: { canonical: "/untuk-vendor" },
};

const SHOT = "/showcase/pages";

// Only what the product does today: register (business name, email, password,
// agreement) -> fill profile, portfolio, packages -> Admin review -> listed.
const SIGNUP: JoinStep[] = [
  {
    title: "Buat akun vendor",
    body: "Isi nama usaha, email, dan kata sandi, lalu centang persetujuan Perjanjian Kemitraan.",
    result: "Satu formulir pendek",
    screen: {
      src: `${SHOT}/v-daftar.webp`,
      alt: "Formulir daftar sebagai vendor: nama usaha, email, kata sandi, dan persetujuan perjanjian",
      kind: "phone",
    },
  },
  {
    title: "Lengkapi etalase",
    body: "Kategori, kota, kisaran harga, cerita usaha, foto karya, dan paket. Ada penanda kelengkapannya.",
    result: "Profil, portofolio, paket",
    screen: {
      src: `${SHOT}/v-etalase.webp`,
      alt: "Editor etalase vendor dengan identitas usaha dan daftar kelengkapan etalase",
      kind: "desk",
    },
  },
  {
    title: "Ditinjau Admin, lalu tampil",
    body: "Setelah disetujui Admin DuaCincin, usahamu muncul di direktori dan halaman kategori.",
    result: "Statusnya terlihat di dashboard",
    screen: {
      src: `${SHOT}/k1-direktori.webp`,
      alt: "Kartu vendor Sanggar Rias Kencana tampil di direktori DuaCincin",
      kind: "phone",
    },
  },
];

const SHOWCASE: ShowcaseItem[] = [
  {
    id: "hari-ini",
    title: "Hari ini",
    body: "Satu layar untuk yang paling mendesak: permintaan baru, acara terdekat, dan dana yang ditahan.",
    src: `${SHOT}/v-dashboard.webp`,
    alt: "Dashboard vendor: satu client menunggu jawaban, permintaan booking baru, dan ringkasan pencairan",
    address: "duacincin.id/vendor/dashboard",
    phoneSrc: `${SHOT}/v-dashboard-m.webp`,
  },
  {
    id: "booking",
    title: "Detail booking",
    body: "Paket, tanggal, harga, DP dan pelunasan, plus langkah berikutnya untuk setiap booking.",
    src: `${SHOT}/v-booking.webp`,
    alt: "Detail booking Paket Rias Paes Ageng: DP sudah masuk Dana Aman, rincian DP dan pelunasan",
    address: "duacincin.id/vendor/bookings",
    phoneSrc: `${SHOT}/v-booking-m.webp`,
  },
  {
    id: "etalase",
    title: "Etalase",
    body: "Atur profil, portofolio, dan paket, dengan pratinjau persis seperti yang dilihat calon pengantin.",
    src: `${SHOT}/v-etalase.webp`,
    alt: "Editor etalase dengan langkah profil, portofolio, dan paket harga serta kelengkapan etalase",
    address: "duacincin.id/vendor/profile",
    phoneSrc: `${SHOT}/v-etalase-m.webp`,
  },
  {
    id: "pencairan",
    title: "Pencairan",
    body: "Dana yang ditahan DuaCincin, yang siap ditransfer, dan riwayat lengkap setiap pencairan.",
    src: `${SHOT}/v-pencairan.webp`,
    alt: "Halaman pencairan: dana ditahan DuaCincin dan riwayat pencairan dengan harga booking dan komisi",
    address: "duacincin.id/vendor/payouts",
    phoneSrc: `${SHOT}/v-pencairan-m.webp`,
  },
];

export default function UntukVendorPage() {
  return (
    <PublicShell>
      <div className="wd">
        <VendorHero />

        <section aria-labelledby="perks-judul" className="py-14 sm:py-20">
          <div className="wd-container">
            <SectionHead id="perks-judul" title="Yang kamu dapat di DuaCincin" sub="Empat hal yang bikin kamu fokus mengerjakan acara." />
            <div className="mt-10">
              <VendorPerks />
            </div>
          </div>
        </section>

        <section
          id="yang-kamu-dapat"
          aria-labelledby="dapat-judul"
          className="scroll-mt-36 bg-wd-paper py-14 sm:py-20"
        >
          <div className="wd-container">
            <SectionHead
              id="dapat-judul"
              title="Satu dashboard, dari permintaan sampai pencairan"
              sub="Layar aslinya. Pilih untuk melihat lebih dekat."
            />
            <div className="mt-10">
              <VendorShowcase items={SHOWCASE} />
            </div>
          </div>
        </section>

        <section aria-labelledby="dana-judul" className="py-14 sm:py-20">
          <div className="wd-container grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHead
                id="dana-judul"
                title="Uang client aman sebelum kamu bekerja"
              />
              <p className="mt-4 max-w-md leading-relaxed text-wd-text">
                DP dan pelunasan dibayar ke akun penampung DuaCincin. Setelah
                client mengonfirmasi acara selesai, dana diteruskan ke
                rekeningmu sebesar harga yang kamu tetapkan.
              </p>
              <p className="mt-3 text-sm text-wd-muted">
                Geser harga paket untuk melihat contohnya.
              </p>
            </div>
            <div className="lg:col-span-7">
              <PayoutCalculator />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="daftar-judul"
          className="bg-wd-paper py-14 sm:py-20"
        >
          <div className="wd-container">
            <SectionHead
              id="daftar-judul"
              title="Cara bergabung"
              sub="Dari formulir pendek sampai tampil di direktori."
              action={
                <Link
                  href="/register?role=vendor"
                  className={wdButton({ variant: "ink" })}
                >
                  Mulai daftar
                </Link>
              }
            />
            <div className="mt-10">
              <JoinPath steps={SIGNUP} />
            </div>
          </div>
        </section>

        <section aria-labelledby="kategori-judul" className="py-14 sm:py-20">
          <div className="wd-container">
            <SectionHead
              id="kategori-judul"
              title="Kategori yang dicari calon pengantin"
            />
            <Reveal>
              <ul className="dc-stagger mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
                {VENDOR_CATEGORIES.map((c) => {
                  const art = artFor(c.value);
                  return (
                    <li key={c.value} className="text-center">
                      <Link
                        href={`/kategori/${c.value}`}
                        className="group block"
                      >
                        <span
                          className={`relative block aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[16px] bg-wd-blush ${LIFT} group-hover:-translate-y-1 group-hover:shadow-wd-lift`}
                        >
                          <Image
                            src={art.src}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
                            style={{ objectPosition: art.focus ?? "50% 28%" }}
                            className={ZOOM}
                          />
                        </span>
                        <span className="mt-3 block font-semibold text-wd-ink transition-colors group-hover:text-wd-accent-ink">
                          {c.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-wd-muted">
                          {art.covers}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>
        </section>

        <section aria-labelledby="aturan-judul" className="pb-14 sm:pb-20">
          <div className="wd-container">
            <div className="flex flex-col gap-6 rounded-[24px] bg-wd-accent-wash p-7 ring-1 ring-wd-accent-soft sm:p-10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2
                  id="aturan-judul"
                  className="wd-title text-[clamp(1.4rem,2.4vw,1.85rem)]"
                >
                  Transaksi tetap di dalam platform
                </h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-wd-text">
                  Setiap vendor terikat Perjanjian Kemitraan yang melarang
                  transaksi di luar DuaCincin. Nomor telepon, email, dan tautan
                  luar di chat ditandai untuk ditinjau Admin.
                </p>
                <Link
                  href="/legal/vendor-agreement"
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink"
                >
                  Baca Perjanjian Kemitraan Vendor
                </Link>
              </div>
              <Link
                href="/register?role=vendor"
                className={wdButton({
                  size: "lg",
                  className: "self-start lg:self-auto",
                })}
              >
                Daftar sebagai vendor
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
