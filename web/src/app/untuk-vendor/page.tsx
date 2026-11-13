import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicShell } from "@/components/landing/PublicShell";
import { Reveal } from "@/components/landing/Reveal";
import { CountUp } from "@/components/public/untuk-vendor/CountUp";
import { JoinPath, type JoinStep } from "@/components/public/untuk-vendor/JoinPath";
import { PayoutCalculator } from "@/components/public/untuk-vendor/PayoutCalculator";
import { VendorHeroVisual } from "@/components/public/untuk-vendor/VendorHeroVisual";
import { VendorShowcase, type ShowcaseItem } from "@/components/public/untuk-vendor/VendorShowcase";
import { ButtonLink } from "@/components/ui/Button";
import { Rings } from "@/components/ui/Rings";
import { VENDOR_CATEGORIES } from "@/lib/api";

export const metadata: Metadata = {
  title: "Untuk vendor: terima booking dan pembayaran lewat escrow",
  description:
    "Daftarkan profil dan portofolio usaha pernikahanmu di DuaCincin, terima booking lewat chat, dan terima pembayaran setelah acara selesai dikonfirmasi.",
};

const SHOT = "/showcase/pages";

// Only what the product does today: register (business name, email, password,
// agreement) -> fill profile, portfolio, packages -> Admin review -> listed.
const SIGNUP: JoinStep[] = [
  {
    title: "Buat akun vendor",
    body: "Isi nama usaha, email, dan kata sandi. Dengan mendaftar, kamu menyetujui Perjanjian Kemitraan.",
    result: "Satu formulir pendek",
    screen: { src: `${SHOT}/v-daftar.webp`, alt: "Formulir daftar sebagai vendor: nama usaha, email, kata sandi, dan persetujuan perjanjian", kind: "phone" },
  },
  {
    title: "Lengkapi etalase",
    body: "Kategori, kota, kisaran harga, cerita usaha, foto karya, dan paket. Ada penanda kelengkapannya.",
    result: "Profil, portofolio, paket",
    screen: { src: `${SHOT}/v-etalase.webp`, alt: "Editor etalase vendor dengan identitas usaha dan daftar kelengkapan etalase", kind: "desk" },
  },
  {
    title: "Ditinjau Admin, lalu tampil",
    body: "Setelah disetujui Admin DuaCincin, usahamu muncul di direktori dan halaman kategori.",
    result: "Statusnya terlihat di dashboard",
    screen: { src: `${SHOT}/k1-direktori.webp`, alt: "Kartu vendor Sanggar Rias Kencana tampil di direktori DuaCincin", kind: "phone" },
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
    alt: "Detail booking Paket Rias Paes Ageng: DP sudah masuk escrow, rincian DP dan pelunasan",
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
    body: "Dana yang ditahan escrow, yang siap ditransfer, dan riwayat lengkap dengan potongan komisinya.",
    src: `${SHOT}/v-pencairan.webp`,
    alt: "Halaman pencairan: dana ditahan escrow dan riwayat pencairan dengan harga booking dan komisi",
    address: "duacincin.id/vendor/payouts",
    phoneSrc: `${SHOT}/v-pencairan-m.webp`,
  },
];

// Category photos shared with the home mosaic and /kategori (DuaCincin
// Pinterest board, credited on /kredit).
const CATEGORY_PHOTO: Record<string, { src: string; studio?: boolean; note: string }> = {
  venue: { src: "/photos/pinterest/venue-joglo.webp", note: "Gedung, ballroom, taman" },
  catering: { src: "/photos/pinterest/katering-jajanan.webp", note: "Prasmanan, gubukan, menu adat" },
  decor: { src: "/photos/pinterest/dekorasi-taman.webp", note: "Pelaminan, gapura, bunga" },
  mua_attire: { src: "/photos/pinterest/rias-hijab.webp", note: "Rias, busana adat, gaun" },
  photo_video: { src: "/photos/pinterest/foto-gapura.webp", note: "Foto, video, prewedding" },
  entertainment: { src: "/photos/pinterest/kirab-malam.webp", note: "Musik, MC, hiburan adat" },
  invitation_souvenir: { src: "/photos/pinterest/suvenir-anggrek.webp", note: "Undangan cetak, suvenir" },
};

const FACTS = [
  { v: <CountUp to={10} suffix="%" />, k: "Komisi standar", d: "Dipotong saat pencairan, hanya dari transaksi yang berhasil." },
  { v: <CountUp to={30} suffix="%" />, k: "DP dari client", d: "Ditahan escrow bersama pelunasannya." },
  { v: "Setelah acara", k: "Dana cair", d: "Begitu client mengonfirmasi acara selesai." },
];

export default function UntukVendorPage() {
  return (
    <PublicShell overlay={false}>
      {/* Paper hero: the visual is the vendor's own workspace (real dashboard
          and booking screens) in front of the gold arch ornament. */}
      <section className="dc-grain relative overflow-hidden bg-dc-ivory">
        <div className="dc-container grid items-center gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-16">
          <div className="lg:col-span-6">
            <p className="dc-eyebrow animate-fade-up">Untuk vendor</p>
            <h1 className="mt-5 animate-fade-up font-heading text-[clamp(2.6rem,5.4vw,4.75rem)] leading-[0.98] text-dc-ink">
              Punya usaha pernikahan? <span className="dc-em">Tampilkan karyamu.</span>
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-dc-text-2">
              Calon pengantin mencari, berdiskusi, dan membayar di satu tempat. Kamu fokus mengerjakan acara.
            </p>
            <div className="mt-8 flex animate-fade-up flex-col gap-3 sm:flex-row">
              <ButtonLink href="/register?role=vendor" variant="gold" size="lg">
                Daftar sebagai vendor
              </ButtonLink>
              <ButtonLink href="#yang-kamu-dapat" variant="ghost" size="lg">
                Lihat dashboard vendor
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-6">
            <VendorHeroVisual />
          </div>
        </div>
        <div className="dc-container pb-14 lg:pb-20">
          <dl className="grid animate-fade-up gap-px overflow-hidden rounded-2xl border border-dc-line bg-dc-line sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.k} className="bg-dc-white px-6 py-5">
                <dt className="text-sm font-semibold text-dc-ink">{f.k}</dt>
                <dd>
                  <span className="block font-heading text-[2.4rem] leading-tight text-dc-clay">{f.v}</span>
                  <span className="block text-sm leading-relaxed text-dc-text-3">{f.d}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="yang-kamu-dapat" aria-labelledby="dapat-judul" className="scroll-mt-20 bg-dc-cream">
        <div className="dc-container py-16 sm:py-24 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="dc-eyebrow">Yang kamu dapat</p>
            <h2 id="dapat-judul" className="mt-4 font-heading text-[clamp(2.2rem,4.2vw,3.5rem)] leading-[1.02] text-dc-ink">
              Satu dashboard, <span className="dc-em">dari permintaan sampai pencairan.</span>
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-dc-text-2">Ini layar aslinya. Pilih untuk melihat lebih dekat.</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 lg:mt-14">
            <VendorShowcase items={SHOWCASE} />
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="dana-judul" className="bg-dc-ivory">
        <div className="dc-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16 lg:py-28">
          <Reveal className="lg:col-span-5">
            <p className="dc-eyebrow">Alur pembayaran</p>
            <h2 id="dana-judul" className="mt-4 font-heading text-[clamp(2.2rem,4.2vw,3.5rem)] leading-[1.02] text-dc-ink">
              Uang client sudah aman <span className="dc-em">sebelum kamu mulai bekerja.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-dc-text-2">
              DP dan pelunasan dibayar ke akun penampung DuaCincin. Setelah client mengonfirmasi acara selesai, dana diteruskan ke rekeningmu dikurangi komisi.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-dc-text-3">Geser harga paket untuk melihat contohnya.</p>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-7">
            <PayoutCalculator />
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="daftar-judul" className="bg-dc-cream">
        <div className="dc-container py-16 sm:py-24 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Reveal>
              <p className="dc-eyebrow">Cara bergabung</p>
              <h2 id="daftar-judul" className="mt-4 max-w-2xl font-heading text-[clamp(2.2rem,4.2vw,3.5rem)] leading-[1.02] text-dc-ink">
                Dari formulir pendek <span className="dc-em">sampai tampil di direktori.</span>
              </h2>
            </Reveal>
            <ButtonLink href="/register?role=vendor" variant="primary" size="md" className="self-start lg:self-auto">
              Mulai daftar
            </ButtonLink>
          </div>
          <div className="mt-12">
            <JoinPath steps={SIGNUP} />
          </div>
        </div>
      </section>

      <section aria-labelledby="kategori-judul" className="bg-dc-ivory">
        <div className="dc-container py-16 sm:py-24">
          <Reveal className="max-w-2xl">
            <p className="dc-eyebrow">Kategori</p>
            <h2 id="kategori-judul" className="mt-4 font-heading text-[clamp(2rem,3.8vw,3.1rem)] leading-[1.04] text-dc-ink">
              Tujuh kategori <span className="dc-em">yang dicari calon pengantin.</span>
            </h2>
          </Reveal>
          <ul className="dc-stagger -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
            {VENDOR_CATEGORIES.map((c, i) => {
              const photo = CATEGORY_PHOTO[c.value];
              return (
                <li key={c.value} className={`w-[72%] shrink-0 snap-start sm:w-auto ${i === 0 ? "lg:col-span-2 lg:row-span-2" : i >= 5 ? "lg:col-span-2" : ""}`}>
                  <Link
                    href={`/kategori/${c.value}`}
                    className="group relative block h-full overflow-hidden rounded-2xl border border-dc-line bg-dc-cream shadow-soft transition-shadow duration-500 hover:shadow-lift"
                  >
                    <div className={`relative ${i === 0 ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[420px]" : i >= 5 ? "aspect-[4/5] lg:aspect-[2/1]" : "aspect-[4/5]"} ${photo?.studio ? "bg-[radial-gradient(120%_80%_at_50%_100%,#ead7ae_0%,#f3ecdf_60%,#faf6ef_100%)]" : ""}`}>
                      {photo && (
                        <Image
                          src={photo.src}
                          alt=""
                          fill
                          sizes={i === 0 ? "(min-width: 1024px) 560px, 72vw" : "(min-width: 1024px) 280px, (min-width: 640px) 45vw, 72vw"}
                          className={`transition-transform duration-700 ease-dc group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${photo.studio ? "object-contain p-6" : "object-cover"}`}
                        />
                      )}
                      <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-dc-ink/95 via-dc-ink/60 to-transparent" />
                      <span className="absolute inset-x-0 bottom-0 p-5">
                        <span className="block font-heading text-[1.7rem] leading-tight text-dc-on-dark">{c.label}</span>
                        {photo && <span className="mt-1 block text-sm text-dc-on-dark/85">{photo.note}</span>}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="dc-on-dark relative isolate overflow-hidden bg-dc-ink">
        <Rings className="absolute -right-24 -top-16 -z-10 h-[360px] w-[580px] opacity-[0.12]" stroke="var(--dc-gold-antique)" strokeWidth={0.4} />
        <div className="dc-container grid gap-8 py-16 sm:py-20 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <h2 className="max-w-3xl font-heading text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] text-dc-on-dark">
              Aturan mainnya jelas sejak awal: <span className="dc-em-light">transaksi tetap di dalam platform.</span>
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-dc-on-dark/80">
              Setiap vendor terikat Perjanjian Kemitraan yang melarang transaksi di luar DuaCincin. Nomor telepon, email, dan tautan luar di chat ditandai untuk ditinjau Admin.
            </p>
            <Link
              href="/legal/vendor-agreement"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-dc-gold-antique underline decoration-dc-gold-antique/40 underline-offset-4 hover:decoration-dc-gold-antique"
            >
              Baca Perjanjian Kemitraan Vendor
            </Link>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <ButtonLink href="/register?role=vendor" variant="gold" size="lg">
              Daftar sebagai vendor
            </ButtonLink>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
