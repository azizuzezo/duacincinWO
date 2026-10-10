import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";

export const metadata: Metadata = {
  title: "Cara kerja dari pilih vendor sampai hari-H",
  description:
    "Tujuh tahap pemesanan di DuaCincin, dan di mana uangmu berada pada setiap tahap: ditahan escrow sampai acara selesai.",
};

// PRD §8.11, one row per stage, with where the client's money sits.
const STEPS = [
  { fund: "Belum ada pembayaran", title: "Cari vendor atau minta rekomendasi", body: "Jelajahi direktori sendiri, atau ceritakan kebutuhan dan anggaranmu ke wedding consultant DuaCincin. Konsultan bisa mengirim tautan profil vendor langsung ke chat." },
  { fund: "Belum ada pembayaran", title: "Diskusi dengan vendor", body: "Bahas paket, tanggal, dan harga lewat chat di dalam DuaCincin. Seluruh riwayat tersimpan sebagai rujukan kalau terjadi selisih paham." },
  { fund: "Belum ada pembayaran", title: "Ajukan booking", body: "Tanggal, paket, dan harga hasil diskusi kamu ajukan ke vendor. Vendor mengonfirmasi, dan status booking berubah dari diajukan menjadi dikonfirmasi." },
  { fund: "Ditahan escrow", title: "Bayar DP", body: "DP masuk ke akun penampung DuaCincin lewat Midtrans, belum ke rekening vendor. Tanggal vendor terkunci untukmu." },
  { fund: "Ditahan escrow", title: "Meeting dengan konsultan (opsional)", body: "Kalau kamu butuh pendampingan, jadwalkan sesi dengan wedding consultant lewat kanal konsultasi yang sama, misalnya untuk meninjau ulang anggaran." },
  { fund: "Ditahan escrow", title: "Pelunasan dan technical meeting", body: "Kamu melunasi sisa pembayaran. Lalu kamu, vendor, dan konsultan (bila diminta) menyepakati rundown, denah, dan jadwal kru. Technical meeting wajib ada sebelum hari-H." },
  { fund: "Diteruskan ke vendor", title: "Hari-H selesai", body: "Setelah kamu mengonfirmasi acara selesai, dana diteruskan ke vendor dikurangi komisi platform. Kalau ada masalah, kamu bisa mengajukan sengketa dan Admin menengahi." },
];

export default function CaraKerjaPage() {
  return (
    <PublicShell>
      <PageHero
        image="/stock/couple-walk.webp"
        title={
          <>
            Dana baru pindah tangan <span className="dc-em-light">setelah acaramu selesai</span>
          </>
        }
        subtitle="Tujuh tahap dari chat pertama sampai hari-H. Kolom di sebelah kiri menunjukkan di mana uangmu berada pada tiap tahap."
      />
      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-3 border-t border-dc-ink/15 py-8 sm:grid-cols-[3rem_11rem_1fr] sm:gap-8">
              <p className="font-sans text-sm tabular-nums text-dc-black/70" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="text-sm font-semibold text-dc-clay">{s.fund}</p>
              <div>
                <h2 className="font-heading text-3xl text-dc-ink">{s.title}</h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-dc-ink/80">{s.body}</p>
              </div>
            </li>
          ))}
          <li className="border-t border-dc-ink/15" aria-hidden />
        </ol>

        <div className="mt-14 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vendors"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-dc-ink px-7 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
          >
            Cari vendor
          </Link>
          <Link
            href="/bantuan"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-dc-ink/25 px-7 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink hover:bg-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
          >
            Pertanyaan umum
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
