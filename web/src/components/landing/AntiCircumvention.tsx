import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";

const POINTS = [
  {
    title: "Escrow untuk client",
    body: "Pembayaran ditahan di akun penampung dan baru diteruskan ke vendor setelah kamu mengonfirmasi acara selesai.",
  },
  {
    title: "Bukti tercatat",
    body: "Riwayat chat dan booking tersimpan, jadi ada rujukan bila terjadi sengketa. Admin menengahinya lewat jalur dispute resmi.",
  },
  {
    title: "Chat yang mengawasi kontak",
    body: "Nomor telepon, email, dan tautan luar yang dibagikan di chat ditandai untuk ditinjau Admin. Pesan tetap terkirim, tidak diblokir.",
  },
  {
    title: "Vendor terikat perjanjian",
    body: "Setiap vendor menyetujui Perjanjian Kemitraan sebelum akunnya aktif. Pelanggaran dikenai sanksi bertingkat.",
  },
];

/** Why transactions stay inside: four real protections as a numbered
 * two-column index on paper (not cards), with the legal pages as proof. */
export function AntiCircumvention() {
  return (
    <section aria-labelledby="perlindungan-judul" className="bg-dc-cream">
      <div className="dc-container py-20 sm:py-28">
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="dc-eyebrow">Perlindungan dua arah</p>
            <h2 id="perlindungan-judul" className="mt-4 font-heading text-[clamp(2.3rem,4.4vw,3.8rem)] leading-[1.04] text-dc-ink">
              Boleh lihat-lihat bebas. <span className="dc-em">Transaksinya</span> tetap di dalam.
            </h2>
          </div>
          <p className="max-w-md leading-relaxed text-dc-text-2 lg:col-span-5">
            Portofolio vendor terbuka tanpa login. Begitu masuk ke chat, booking, dan pembayaran, semuanya berjalan di
            DuaCincin supaya dua pihak sama-sama terlindungi.
          </p>
        </Reveal>
        <Reveal>
        <ol className="dc-stagger mt-12 grid gap-x-16 sm:grid-cols-2">
          {POINTS.map((p, i) => (
            <li key={p.title} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-dc-line-strong py-7">
              <span aria-hidden className="pt-1 text-sm font-semibold tabular-nums text-dc-clay">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-heading text-[1.75rem] leading-tight text-dc-ink">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-dc-text-2">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
        </Reveal>
        <div className="mt-6 flex flex-wrap gap-x-8">
          <Link href="/legal/client-tos" className="inline-flex min-h-11 items-center font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
            Baca ketentuan client
          </Link>
          <Link href="/legal/vendor-agreement" className="inline-flex min-h-11 items-center font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
            Baca perjanjian vendor
          </Link>
        </div>
      </div>
    </section>
  );
}
