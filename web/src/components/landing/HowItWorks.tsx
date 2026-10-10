import Image from "next/image";

import { Reveal } from "@/components/landing/Reveal";

const STAGES = [
  {
    fund: "Belum ada pembayaran",
    title: "Pilih vendor dan diskusi",
    body: "Bandingkan portofolio, lalu bahas paket dan harga lewat chat di dalam DuaCincin. Bingung memilih? Minta rekomendasi ke wedding consultant.",
  },
  {
    fund: "Belum ada pembayaran",
    title: "Ajukan booking",
    body: "Tanggal, paket, dan harga hasil diskusi kamu ajukan ke vendor. Vendor mengonfirmasi.",
  },
  {
    fund: "Ditahan escrow",
    title: "Bayar DP",
    body: "DP masuk ke akun penampung DuaCincin lewat Midtrans, belum ke rekening vendor. Tanggalmu terkunci untukmu.",
  },
  {
    fund: "Ditahan escrow",
    title: "Pelunasan dan technical meeting",
    body: "Setelah pelunasan, kamu, vendor, dan konsultan (bila diminta) menyepakati rundown, denah, dan jadwal kru sebelum hari-H.",
  },
  {
    fund: "Diteruskan ke vendor",
    title: "Hari-H selesai",
    body: "Kamu mengonfirmasi acara selesai. Baru setelah itu dana diteruskan ke vendor, dikurangi komisi platform.",
  },
];

export function HowItWorks() {
  return (
    <section id="alur-booking" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <h2 className="font-heading text-4xl leading-[1.05] text-dc-ink sm:text-5xl">
                Dana baru pindah tangan <span className="dc-em">setelah acaramu selesai.</span>
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-dc-ink/80">
                Dari chat pertama sampai hari-H, setiap tahap tercatat. Kolom di sebelah kanan menunjukkan di mana
                uangmu berada pada tiap tahap.
              </p>
            </Reveal>
            <div className="relative mt-10 hidden aspect-[4/5] max-w-sm overflow-hidden rounded-lg bg-dc-ink lg:block">
              <Image
                src="/stock/couple-studio.webp"
                alt="Pasangan pengantin berbusana putih duduk bersama"
                fill
                sizes="384px"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>

        <ol className="lg:col-span-7">
          {STAGES.map((s) => (
            <li key={s.title} className="grid gap-2 border-t border-dc-ink/15 py-7 sm:grid-cols-[9.5rem_1fr] sm:gap-8">
              <p className="text-sm font-semibold text-dc-clay">{s.fund}</p>
              <div>
                <h3 className="font-heading text-3xl text-dc-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-dc-ink/80">{s.body}</p>
              </div>
            </li>
          ))}
          <li className="border-t border-dc-ink/15" aria-hidden />
        </ol>
      </div>
    </section>
  );
}
