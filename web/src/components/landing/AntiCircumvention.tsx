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

/** The single dark ink block of the page. */
export function AntiCircumvention() {
  return (
    <section className="bg-dc-ink text-dc-ivory">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
        <Reveal className="lg:col-span-5">
          <h2 className="font-heading text-4xl leading-[1.05] sm:text-5xl">
            Boleh lihat-lihat bebas. <span className="dc-em-light">Transaksinya</span> tetap di dalam.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-dc-ivory/80">
            Portofolio vendor terbuka tanpa login. Begitu masuk ke chat, booking, dan pembayaran, semuanya berjalan di
            DuaCincin supaya dua pihak sama-sama terlindungi.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6">
            <Link href="/legal/client-tos" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-dc-white">
              Baca ketentuan client
            </Link>
            <Link href="/legal/vendor-agreement" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-dc-white">
              Baca perjanjian vendor
            </Link>
          </div>
        </Reveal>
        <ul className="lg:col-span-7">
          {POINTS.map((p) => (
            <li key={p.title} className="border-t border-dc-ivory/20 py-6 last:border-b">
              <h3 className="font-heading text-3xl">{p.title}</h3>
              <p className="mt-2 max-w-xl leading-relaxed text-dc-ivory/80">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
