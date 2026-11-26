import type { Metadata } from "next";

import Link from "next/link";

import { SectionHead, wdButton } from "@/components/home/ui";
import { PageHero } from "@/components/landing/PageHero";
import { Reveal } from "@/components/landing/Reveal";
import { PublicShell } from "@/components/landing/PublicShell";
import {
  MoneyJourney,
  type Stage,
} from "@/components/public/cara-kerja/MoneyJourney";
import { PhoneFrame } from "@/components/ui/DeviceFrame";
import { breadcrumbLd, JsonLd, webPageLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Cara kerja dari pilih vendor sampai hari-H",
  description:
    "Tujuh tahap pemesanan di DuaCincin, dan di mana uangmu berada pada setiap tahap: ditahan DuaCincin sampai acara selesai (Dana Aman, atau escrow).",
  alternates: { canonical: "/cara-kerja" },
};

// PRD §8.11, one entry per stage, with where the client's money sits and the
// booking status the client sees in the app (lib/api BOOKING_STATUS_LABEL).
const SHOT = "/showcase/pages";
const STAGES: Stage[] = [
  {
    station: 0,
    status: null,
    title: "Cari vendor atau minta rekomendasi",
    body: "Jelajahi direktori sendiri, atau ceritakan kebutuhanmu ke wedding consultant.",
    where: "Direktori vendor",
    screen: {
      src: `${SHOT}/k1-direktori.webp`,
      alt: "Layar direktori vendor DuaCincin: kartu Sanggar Rias Kencana dengan harga mulai dari dan rating",
    },
  },
  {
    station: 0,
    status: null,
    title: "Diskusi dengan vendor",
    body: "Bahas paket, tanggal, dan harga lewat chat. Riwayatnya tersimpan sebagai rujukan.",
    where: "Pesan, langsung dengan vendor",
    screen: {
      src: `${SHOT}/k2-chat.webp`,
      alt: "Layar chat dengan Pendopo Ageng Sriwedari yang menanyakan ketersediaan tanggal",
    },
  },
  {
    station: 0,
    status: "confirmed",
    title: "Ajukan booking",
    body: "Ajukan tanggal dan paket hasil diskusi. Vendor mengonfirmasi.",
    where: "Booking, dari halaman vendor",
    screen: {
      src: `${SHOT}/k3-vendor.webp`,
      alt: "Halaman vendor dengan pilihan tanggal, tombol ajukan booking, dan penjelasan Dana Aman",
    },
  },
  {
    station: 1,
    status: "dp_paid",
    title: "Bayar DP",
    body: "DP masuk ke akun penampung DuaCincin, belum ke vendor. Tanggalmu terkunci.",
    where: "Pembayaran di halaman booking",
    screen: {
      src: `${SHOT}/k4-dp.webp`,
      alt: "Detail booking Sanggar Rias Kencana berstatus DP dibayar, menunggu pelunasan",
    },
  },
  {
    station: 1,
    status: "dp_paid",
    title: "Meeting dengan konsultan (opsional)",
    body: "Butuh pendampingan? Jadwalkan sesi dengan wedding consultant.",
    where: "Konsultasi",
    screen: {
      src: `${SHOT}/k5-konsultan.webp`,
      alt: "Layar konsultasi dengan tombol chat dan jadwalkan video call",
    },
  },
  {
    station: 1,
    status: "full_paid",
    title: "Pelunasan dan technical meeting",
    body: "Lunasi sisanya, lalu sepakati rundown dan jadwal kru sebelum hari-H.",
    where: "Pembayaran dan wedding planner",
    screen: {
      src: `${SHOT}/k6-lunas.webp`,
      alt: "Perjalanan booking yang sudah lunas dan menunggu technical meeting",
    },
  },
  {
    station: 2,
    status: "completed",
    title: "Hari-H selesai",
    body: "Kamu konfirmasi acara selesai, lalu dana diteruskan ke vendor.",
    where: "Konfirmasi selesai di halaman booking",
    screen: {
      src: `${SHOT}/k7-selesai.webp`,
      alt: "Booking berstatus selesai dengan ajakan menulis ulasan untuk vendor",
    },
  },
];

const JUMPS = [
  { href: "#tahap-1", label: "Sebelum bayar", sub: "Tahap 1 sampai 3" },
  { href: "#tahap-4", label: "Dana ditahan", sub: "Tahap 4 sampai 6" },
  { href: "#tahap-7", label: "Setelah hari-H", sub: "Tahap 7" },
];

export default function CaraKerjaPage() {
  return (
    <PublicShell>
      <JsonLd
        data={webPageLd(
          "WebPage",
          "/cara-kerja",
          "Cara kerja DuaCincin",
          "Tahap pemesanan vendor di DuaCincin dan di mana uangmu berada pada setiap tahap (Dana Aman atau escrow).",
        )}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Beranda", path: "/" },
          { name: "Cara kerja", path: "/cara-kerja" },
        ])}
      />
      <div className="wd">
        <PageHero
          crumbs={[{ name: "Cara kerja Dana Aman" }]}
          title="Cara kerja Dana Aman"
          sub="Tujuh tahap dari chat pertama sampai hari-H. Dana baru diteruskan ke vendor setelah acaramu selesai."
          image="/banner/foto-escrow.webp"
          focus="75% 50%"
        >
          <ul className="mt-6 flex flex-wrap gap-2">
            {JUMPS.map((j) => (
              <li key={j.href}>
                <a
                  href={j.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-wd-line-2 bg-white px-4 text-sm font-semibold text-wd-ink transition-colors hover:border-wd-ink"
                >
                  {j.label}
                  <span className="font-normal text-wd-muted">{j.sub}</span>
                </a>
              </li>
            ))}
          </ul>
        </PageHero>

        <MoneyJourney stages={STAGES} />

        <section
          aria-labelledby="masalah-judul"
          className="bg-wd-paper py-14 sm:py-20"
        >
          <div className="wd-container grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <SectionHead
                id="masalah-judul"
                title="Kalau ada yang tidak beres"
                sub="Riwayatnya tercatat, Admin DuaCincin menengahi."
              />
              <Reveal>
                <ul className="dc-stagger mt-8 flex flex-col gap-4">
                  <li className="rounded-[18px] border-l-4 border-wd-accent bg-white p-5 ring-1 ring-wd-line">
                    <p className="font-semibold text-wd-ink">
                      Sengketa dengan vendor
                    </p>
                    <p className="mt-1 leading-relaxed text-wd-text">
                      Ajukan sengketa. Riwayat chat dan booking jadi rujukan.
                    </p>
                  </li>
                  <li className="rounded-[18px] border-l-4 border-wd-accent bg-white p-5 ring-1 ring-wd-line">
                    <p className="font-semibold text-wd-ink">
                      Bayar di luar DuaCincin
                    </p>
                    <p className="mt-1 leading-relaxed text-wd-text">
                      Transfer langsung ke vendor tidak dilindungi Dana Aman. Chat
                      mengingatkanmu sejak pesan pertama.
                    </p>
                  </li>
                </ul>
              </Reveal>
            </div>
            <figure className="lg:col-span-6">
              <PhoneFrame
                src="/showcase/pages/k2-chat.webp"
                alt="Chat dengan vendor di DuaCincin, dengan pengingat untuk menyimpan kesepakatan dan pembayaran di DuaCincin"
                sizes="(min-width: 1024px) 290px, 70vw"
                className="mx-auto w-[min(70%,290px)]"
              />
              <figcaption className="mt-6 text-center text-sm text-wd-muted">
                Pengingat ini tampil di setiap chat dengan vendor.
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="mulai-judul" className="py-14 sm:py-16">
          <div className="wd-container">
            <div className="flex flex-col gap-6 rounded-[24px] bg-wd-accent-wash p-7 ring-1 ring-wd-accent-soft sm:p-10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2
                  id="mulai-judul"
                  className="wd-title text-[clamp(1.4rem,2.4vw,1.85rem)]"
                >
                  Mulai dari tahap pertama
                </h2>
                <p className="mt-2 max-w-lg text-wd-text">
                  Lihat portofolio vendor tanpa masuk. Akun baru dibutuhkan saat
                  kamu mulai chat.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/vendors" className={wdButton({ size: "lg" })}>
                  Cari vendor
                </Link>
                <Link
                  href="/bantuan"
                  className={wdButton({ variant: "outline", size: "lg" })}
                >
                  Pertanyaan umum
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
