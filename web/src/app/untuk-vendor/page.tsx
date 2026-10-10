import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { VENDOR_CATEGORIES } from "@/lib/api";

export const metadata: Metadata = {
  title: "Untuk vendor: terima booking dan pembayaran lewat escrow",
  description:
    "Daftarkan profil dan portofolio usaha pernikahanmu di DuaCincin, terima booking lewat chat, dan terima pembayaran setelah acara selesai dikonfirmasi.",
};

const STEPS = [
  { title: "Daftar dan setujui perjanjian", body: "Isi data usaha, pilih kategori, dan setujui Perjanjian Kemitraan Vendor. Versi dan waktu persetujuanmu dicatat." },
  { title: "Admin memverifikasi", body: "Admin meninjau dokumen legalitasmu. Profilmu baru muncul di direktori setelah disetujui." },
  { title: "Tampilkan karya", body: "Unggah portofolio dan atur harga mulai dari. Client bisa melihat profilmu tanpa perlu masuk." },
  { title: "Terima booking", body: "Client mengajak diskusi lewat chat, lalu mengajukan booking. Kamu mengonfirmasi tanggal dan paket." },
  { title: "Dana cair setelah acara", body: "Pembayaran Client ditahan escrow, lalu diteruskan ke kamu setelah acara dikonfirmasi selesai, dikurangi komisi platform." },
];

export default function UntukVendorPage() {
  return (
    <PublicShell>
      <PageHero
        image="/stock/photographer.webp"
        title={
          <>
            Punya usaha pernikahan? <span className="dc-em-light">Tampilkan karyamu</span>
          </>
        }
        subtitle="Calon pengantin mencari, berdiskusi, dan membayar di satu tempat. Kamu fokus mengerjakan acara."
      >
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register?role=vendor"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-dc-white px-7 text-sm font-semibold text-dc-ink transition-colors hover:bg-dc-gold-antique focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-white"
          >
            Daftar sebagai vendor
          </Link>
          <Link
            href="/legal/vendor-agreement"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-dc-white/50 px-7 text-sm font-semibold text-dc-white transition-colors hover:border-dc-white hover:bg-dc-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-white"
          >
            Baca perjanjian kemitraan
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
        <div className="lg:col-span-5">
          <h2 className="font-heading text-4xl leading-[1.05] text-dc-ink sm:text-5xl">
            Lima langkah dari daftar sampai <span className="dc-em">dana cair.</span>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-dc-ink/80">Kategori yang tersedia saat ini:</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((c) => (
              <li key={c.value} className="rounded-md border border-dc-ink/20 px-3 py-1.5 text-sm text-dc-ink">
                {c.label}
              </li>
            ))}
          </ul>
        </div>
        <ol className="lg:col-span-7">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-2 border-t border-dc-ink/15 py-7 sm:grid-cols-[3rem_1fr] sm:gap-6">
              <p className="font-sans text-sm tabular-nums text-dc-black/70" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </p>
              <div>
                <h3 className="font-heading text-3xl text-dc-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-dc-ink/80">{s.body}</p>
              </div>
            </li>
          ))}
          <li className="border-t border-dc-ink/15" aria-hidden />
        </ol>
      </section>

      <section className="bg-dc-ink">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <h2 className="max-w-3xl font-heading text-3xl leading-tight text-dc-white sm:text-5xl">
            Aturan mainnya jelas sejak awal: <span className="dc-em-light">transaksi tetap di dalam platform.</span>
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-dc-white/80">
            Setiap vendor terikat Perjanjian Kemitraan yang melarang transaksi di luar DuaCincin. Nomor telepon, email,
            dan tautan luar yang dibagikan di chat ditandai untuk ditinjau Admin, dan pelanggaran dikenai sanksi
            bertingkat. Baca isi lengkapnya sebelum mendaftar.
          </p>
          <Link
            href="/legal/vendor-agreement"
            className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-dc-white underline underline-offset-4 hover:text-dc-gold-antique focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-white"
          >
            Perjanjian Kemitraan Vendor
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
