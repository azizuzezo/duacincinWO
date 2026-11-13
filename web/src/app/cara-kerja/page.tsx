import type { Metadata } from "next";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { Reveal } from "@/components/landing/Reveal";
import { JourneyStory, type Stage } from "@/components/public/cara-kerja/JourneyStory";
import { PhonePair } from "@/components/public/cara-kerja/PhonePair";
import { PhoneFrame } from "@/components/ui/DeviceFrame";
import { ButtonLink } from "@/components/ui/Button";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { Rings } from "@/components/ui/Rings";

export const metadata: Metadata = {
  title: "Cara kerja dari pilih vendor sampai hari-H",
  description:
    "Tujuh tahap pemesanan di DuaCincin, dan di mana uangmu berada pada setiap tahap: ditahan escrow sampai acara selesai.",
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
    screen: { src: `${SHOT}/k1-direktori.webp`, alt: "Layar direktori vendor DuaCincin: kartu Sanggar Rias Kencana dengan harga mulai dari dan rating" },
  },
  {
    station: 0,
    status: null,
    title: "Diskusi dengan vendor",
    body: "Bahas paket, tanggal, dan harga lewat chat. Riwayatnya tersimpan sebagai rujukan.",
    where: "Pesan, langsung dengan vendor",
    screen: { src: `${SHOT}/k2-chat.webp`, alt: "Layar chat dengan Pendopo Ageng Sriwedari yang menanyakan ketersediaan tanggal" },
  },
  {
    station: 0,
    status: "confirmed",
    title: "Ajukan booking",
    body: "Ajukan tanggal dan paket hasil diskusi. Vendor mengonfirmasi.",
    where: "Booking, dari halaman vendor",
    screen: { src: `${SHOT}/k3-vendor.webp`, alt: "Halaman vendor dengan pilihan tanggal, tombol ajukan booking, dan penjelasan escrow" },
  },
  {
    station: 1,
    status: "dp_paid",
    title: "Bayar DP",
    body: "DP masuk ke akun penampung DuaCincin, belum ke vendor. Tanggalmu terkunci.",
    where: "Pembayaran di halaman booking",
    screen: { src: `${SHOT}/k4-dp.webp`, alt: "Detail booking Sanggar Rias Kencana berstatus DP dibayar, menunggu pelunasan" },
  },
  {
    station: 1,
    status: "dp_paid",
    title: "Meeting dengan konsultan (opsional)",
    body: "Butuh pendampingan? Jadwalkan sesi dengan wedding consultant.",
    where: "Konsultasi",
    screen: { src: `${SHOT}/k5-konsultan.webp`, alt: "Layar konsultasi dengan tombol chat dan jadwalkan video call" },
  },
  {
    station: 1,
    status: "full_paid",
    title: "Pelunasan dan technical meeting",
    body: "Lunasi sisanya, lalu sepakati rundown dan jadwal kru sebelum hari-H.",
    where: "Pembayaran dan wedding planner",
    screen: { src: `${SHOT}/k6-lunas.webp`, alt: "Perjalanan booking yang sudah lunas dan menunggu technical meeting" },
  },
  {
    station: 2,
    status: "completed",
    title: "Hari-H selesai",
    body: "Kamu konfirmasi acara selesai, lalu dana diteruskan ke vendor dikurangi komisi.",
    where: "Konfirmasi selesai di halaman booking",
    screen: { src: `${SHOT}/k7-selesai.webp`, alt: "Booking berstatus selesai dengan ajakan menulis ulasan untuk vendor" },
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
      <PageHero
        image="/photos/pinterest/akad-joglo-lorong.webp"
        focus="50% 35%"
        eyebrow="Cara kerja"
        title={
          <>
            Dana baru pindah tangan <span className="dc-em-light">setelah acaramu selesai.</span>
          </>
        }
        subtitle="Tujuh tahap dari chat pertama sampai hari-H, dengan layar aslinya."
        aside={
          <div className="hidden lg:block">
            <PhonePair back={STAGES[0].screen} front={STAGES[3].screen} />
          </div>
        }
      >
        <ul className="mt-9 grid max-w-2xl animate-fade-up gap-2 sm:grid-cols-3">
          {JUMPS.map((j) => (
            <li key={j.href}>
              <a
                href={j.href}
                className="flex min-h-14 flex-col justify-center rounded-lg border border-dc-on-dark/25 bg-dc-ink/40 px-4 py-2.5 transition-colors hover:border-dc-gold-antique hover:bg-dc-ink/60"
              >
                <span className="text-sm font-semibold text-dc-on-dark">{j.label}</span>
                <span className="text-xs text-dc-on-dark/75">{j.sub}</span>
              </a>
            </li>
          ))}
        </ul>
      </PageHero>

      <JourneyStory stages={STAGES} />

      <section aria-labelledby="masalah-judul" className="bg-dc-cream">
        <div className="dc-container grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <p className="dc-eyebrow">Kalau ada yang tidak beres</p>
            <h2 id="masalah-judul" className="mt-4 font-heading text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] text-dc-ink">
              Riwayatnya tercatat, <span className="dc-em">ada yang menengahi.</span>
            </h2>
            <ul className="mt-8 flex flex-col gap-5">
              <li className="flex items-start gap-4">
                <FeatureIcon>
                  <path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4z" />
                  <path d="M9 12l2 2 4-4" />
                </FeatureIcon>
                <p className="leading-relaxed text-dc-text-2">
                  <span className="block font-semibold text-dc-ink">Sengketa dengan vendor</span>
                  Ajukan sengketa. Riwayat chat dan booking jadi rujukan, Admin DuaCincin menengahi.
                </p>
              </li>
              <li className="flex items-start gap-4">
                <FeatureIcon>
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M3 10h18M7 15h3" />
                  <path d="M4 4l16 16" />
                </FeatureIcon>
                <p className="leading-relaxed text-dc-text-2">
                  <span className="block font-semibold text-dc-ink">Bayar di luar DuaCincin</span>
                  Transfer langsung ke vendor tidak dilindungi escrow. Chat mengingatkanmu sejak pesan pertama.
                </p>
              </li>
            </ul>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-7">
            <figure className="relative mx-auto max-w-md">
              <PhoneFrame
                src="/showcase/pages/k2-chat.webp"
                alt="Chat dengan vendor di DuaCincin, dengan pengingat untuk menyimpan kesepakatan dan pembayaran di DuaCincin"
                sizes="(min-width: 1024px) 420px, 80vw"
                crop="390 / 420"
                fade="from-dc-cream"
                className="relative mx-auto w-[min(100%,380px)]"
              />
              <figcaption className="relative mt-10 text-center text-sm text-dc-text-2">Layar chat asli: pengingat ini tampil di setiap percakapan dengan vendor.</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="dc-on-dark relative isolate overflow-hidden bg-dc-ink">
        <Rings className="absolute -right-24 -top-16 -z-10 h-[360px] w-[580px] opacity-[0.12]" stroke="var(--dc-gold-antique)" strokeWidth={0.4} />
        <div className="dc-container flex flex-col gap-8 py-16 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-2xl font-heading text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] text-dc-on-dark">
              Siap memulai dari <span className="dc-em-light">tahap pertama?</span>
            </h2>
            <p className="mt-3 max-w-lg text-dc-on-dark/80">Lihat portofolio vendor tanpa perlu masuk. Akun baru dibutuhkan saat kamu mulai chat.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/vendors" variant="gold" size="lg">
              Cari vendor
            </ButtonLink>
            <ButtonLink href="/bantuan" variant="ghostLight" size="lg">
              Baca pertanyaan umum
            </ButtonLink>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
