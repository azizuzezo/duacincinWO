import type { Metadata } from "next";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { Reveal } from "@/components/landing/Reveal";
import { JourneyStory, type Stage } from "@/components/public/cara-kerja/JourneyStory";
import { ButtonLink } from "@/components/ui/Button";
import { Rings } from "@/components/ui/Rings";

export const metadata: Metadata = {
  title: "Cara kerja dari pilih vendor sampai hari-H",
  description:
    "Tujuh tahap pemesanan di DuaCincin, dan di mana uangmu berada pada setiap tahap: ditahan escrow sampai acara selesai.",
};

// PRD §8.11, one entry per stage, with where the client's money sits and the
// booking status the client sees in the app (lib/api BOOKING_STATUS_LABEL).
const STAGES: Stage[] = [
  {
    station: 0,
    status: null,
    title: "Cari vendor atau minta rekomendasi",
    body: "Jelajahi direktori sendiri, atau ceritakan kebutuhan dan anggaranmu ke wedding consultant DuaCincin. Konsultan bisa mengirim tautan profil vendor langsung ke chat.",
    where: "Direktori vendor dan chat konsultan",
  },
  {
    station: 0,
    status: null,
    title: "Diskusi dengan vendor",
    body: "Bahas paket, tanggal, dan harga lewat chat di dalam DuaCincin. Seluruh riwayat tersimpan sebagai rujukan kalau terjadi selisih paham.",
    where: "Pesan, langsung dengan vendor",
  },
  {
    station: 0,
    status: "confirmed",
    title: "Ajukan booking",
    body: "Tanggal, paket, dan harga hasil diskusi kamu ajukan ke vendor. Vendor mengonfirmasi, dan status booking berubah dari diajukan menjadi dikonfirmasi.",
    where: "Booking, dari halaman vendor",
  },
  {
    station: 1,
    status: "dp_paid",
    title: "Bayar DP",
    body: "DP masuk ke akun penampung DuaCincin lewat Midtrans, belum ke rekening vendor. Tanggal vendor terkunci untukmu.",
    where: "Pembayaran di halaman booking",
  },
  {
    station: 1,
    status: "dp_paid",
    title: "Meeting dengan konsultan (opsional)",
    body: "Kalau kamu butuh pendampingan, jadwalkan sesi dengan wedding consultant lewat kanal konsultasi yang sama, misalnya untuk meninjau ulang anggaran.",
    where: "Konsultasi",
  },
  {
    station: 1,
    status: "full_paid",
    title: "Pelunasan dan technical meeting",
    body: "Kamu melunasi sisa pembayaran. Lalu kamu, vendor, dan konsultan (bila diminta) menyepakati rundown, denah, dan jadwal kru. Technical meeting wajib ada sebelum hari-H.",
    where: "Pembayaran dan wedding planner",
  },
  {
    station: 2,
    status: "completed",
    title: "Hari-H selesai",
    body: "Setelah kamu mengonfirmasi acara selesai, dana diteruskan ke vendor dikurangi komisi platform. Kalau ada masalah, kamu bisa mengajukan sengketa dan Admin menengahi.",
    where: "Konfirmasi selesai di halaman booking",
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
        image="/stock/couple-walk.webp"
        focus="60% 50%"
        eyebrow="Cara kerja"
        title={
          <>
            Dana baru pindah tangan <span className="dc-em-light">setelah acaramu selesai.</span>
          </>
        }
        subtitle="Tujuh tahap dari chat pertama sampai hari-H. Di setiap tahap kamu bisa lihat di mana uangmu berada."
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
        <div className="dc-container grid gap-10 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <p className="dc-eyebrow">Kalau ada yang tidak beres</p>
            <h2 id="masalah-judul" className="mt-4 font-heading text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] text-dc-ink">
              Riwayatnya tercatat, <span className="dc-em">ada yang menengahi.</span>
            </h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            <Reveal className="rounded-xl border border-dc-line bg-dc-white p-6 shadow-soft">
              <h3 className="font-heading text-2xl text-dc-ink">Sengketa dengan vendor</h3>
              <p className="mt-2 text-sm leading-relaxed text-dc-text-2">
                Kamu bisa mengajukan sengketa. Riwayat chat dan booking menjadi rujukan, lalu Admin DuaCincin menengahi lewat antrean sengketa.
              </p>
            </Reveal>
            <Reveal delay={0.08} className="rounded-xl border border-dc-line bg-dc-white p-6 shadow-soft sm:mt-10">
              <h3 className="font-heading text-2xl text-dc-ink">Bayar di luar DuaCincin</h3>
              <p className="mt-2 text-sm leading-relaxed text-dc-text-2">
                Transfer langsung ke rekening vendor tidak dilindungi escrow dan tidak tercatat kalau terjadi masalah. Vendor juga terikat perjanjian yang melarangnya.
              </p>
            </Reveal>
          </div>
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
