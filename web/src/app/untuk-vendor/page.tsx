import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicShell } from "@/components/landing/PublicShell";
import { Reveal } from "@/components/landing/Reveal";
import { PayoutCalculator } from "@/components/public/untuk-vendor/PayoutCalculator";
import { ButtonLink } from "@/components/ui/Button";
import { VENDOR_CATEGORIES } from "@/lib/api";

export const metadata: Metadata = {
  title: "Untuk vendor: terima booking dan pembayaran lewat escrow",
  description:
    "Daftarkan profil dan portofolio usaha pernikahanmu di DuaCincin, terima booking lewat chat, dan terima pembayaran setelah acara selesai dikonfirmasi.",
};

// Only what the product does today: register (business name, email, password,
// agreement) -> fill profile, portfolio, packages -> Admin review -> listed.
const SIGNUP = [
  {
    title: "Buat akun vendor",
    body: "Nama usaha, email, dan kata sandi. Kamu menyetujui Perjanjian Kemitraan Vendor di formulir yang sama, dan versi serta waktu persetujuanmu dicatat.",
    fill: "Satu formulir pendek",
  },
  {
    title: "Lengkapi etalase",
    body: "Pilih kategori dan kota, isi kisaran harga dan cerita usahamu, unggah foto karya, lalu susun paket. Client bisa melihat etalasemu tanpa perlu masuk.",
    fill: "Profil, portofolio, paket",
  },
  {
    title: "Ditinjau Admin, lalu tampil",
    body: "Admin DuaCincin meninjau profilmu. Setelah disetujui, usahamu muncul di direktori dan halaman kategori.",
    fill: "Kamu akan melihat statusnya di dashboard",
  },
];

const DASHBOARD = [
  { title: "Booking", body: "Konfirmasi tanggal dan paket yang diajukan client." },
  { title: "Pesan", body: "Diskusi dengan client, semua riwayat tersimpan." },
  { title: "Etalase dan paket", body: "Portofolio dan harga yang dilihat calon pengantin." },
  { title: "Pencairan", body: "Dana yang diteruskan ke kamu, lengkap dengan potongan komisinya." },
];

const FACTS = [
  { v: "10%", k: "Komisi standar", d: "Dipotong saat pencairan, hanya dari transaksi yang berhasil." },
  { v: "30%", k: "DP dari client", d: "Ditahan escrow bersama pelunasannya." },
  { v: "Setelah acara", k: "Dana cair", d: "Begitu client mengonfirmasi acara selesai." },
];

export default function UntukVendorPage() {
  return (
    <PublicShell overlay={false}>
      {/* Paper hero instead of a dark photo: the visual is vendor work itself
          (the owner's real floral gate and reception table cutouts). */}
      <section className="dc-grain relative overflow-hidden bg-dc-ivory">
        <div className="dc-container grid items-center gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-16">
          <div className="lg:col-span-7">
            <p className="dc-eyebrow animate-fade-up">Untuk vendor</p>
            <h1 className="mt-5 animate-fade-up font-heading text-[clamp(2.6rem,5.6vw,4.9rem)] leading-[0.98] text-dc-ink">
              Punya usaha pernikahan? <span className="dc-em">Tampilkan karyamu.</span>
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-dc-text-2">
              Calon pengantin mencari, berdiskusi, dan membayar di satu tempat. Kamu fokus mengerjakan acara.
            </p>
            <div className="mt-8 flex animate-fade-up flex-col gap-3 sm:flex-row">
              <ButtonLink href="/register?role=vendor" variant="gold" size="lg">
                Daftar sebagai vendor
              </ButtonLink>
              <ButtonLink href="/legal/vendor-agreement" variant="ghost" size="lg">
                Baca perjanjian kemitraan
              </ButtonLink>
            </div>
            <dl className="mt-10 grid animate-fade-up gap-px overflow-hidden rounded-xl border border-dc-line bg-dc-line sm:grid-cols-3">
              {FACTS.map((f) => (
                <div key={f.k} className="bg-dc-white px-5 py-4">
                  <dt className="text-sm font-semibold text-dc-ink">{f.k}</dt>
                  <dd>
                    <span className="block font-heading text-[2rem] leading-tight text-dc-clay">{f.v}</span>
                    <span className="block text-xs leading-relaxed text-dc-text-3">{f.d}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:col-span-5" aria-hidden>
            <div className="absolute inset-x-4 bottom-10 top-8 rounded-t-full bg-[radial-gradient(120%_80%_at_50%_100%,#ead7ae_0%,#f3ecdf_60%,#faf6ef_100%)]" />
            <Image src="/scene/arch1.webp" alt="" width={969} height={900} priority sizes="(min-width: 1024px) 448px, 85vw" className="relative w-full" />
            <Image src="/scene/arch2-sm.webp" alt="" width={724} height={500} sizes="(min-width: 1024px) 260px, 50vw" className="absolute -bottom-2 -right-2 w-[58%] drop-shadow-[0_18px_30px_rgba(21,17,13,0.18)]" />
          </div>
        </div>
      </section>

      <section aria-labelledby="dana-judul" className="bg-dc-cream">
        <div className="dc-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16 lg:py-28">
          <Reveal className="lg:col-span-5">
            <p className="dc-eyebrow">Alur pembayaran</p>
            <h2 id="dana-judul" className="mt-4 font-heading text-[clamp(2.2rem,4.2vw,3.5rem)] leading-[1.02] text-dc-ink">
              Uang client sudah aman <span className="dc-em">sebelum kamu mulai bekerja.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-dc-text-2">
              DP dan pelunasan dibayar client ke akun penampung DuaCincin, jadi tanggalmu tidak dipesan dengan janji saja. Setelah client mengonfirmasi acara selesai, dana diteruskan ke rekeningmu dikurangi komisi.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-dc-text-3">Geser harga paket untuk melihat contohnya.</p>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-7">
            <PayoutCalculator />
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="daftar-judul" className="bg-dc-ivory">
        <div className="dc-container py-16 sm:py-24 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Reveal>
              <p className="dc-eyebrow">Cara bergabung</p>
              <h2 id="daftar-judul" className="mt-4 max-w-2xl font-heading text-[clamp(2.2rem,4.2vw,3.5rem)] leading-[1.02] text-dc-ink">
                Tiga langkah sampai <span className="dc-em">tampil di direktori.</span>
              </h2>
            </Reveal>
            <ButtonLink href="/register?role=vendor" variant="primary" size="md" className="self-start lg:self-auto">
              Mulai daftar
            </ButtonLink>
          </div>

          <ol className="mt-12 grid gap-5 lg:grid-cols-3">
            {SIGNUP.map((s, i) => (
              <li key={s.title} className={i === 1 ? "lg:mt-10" : i === 2 ? "lg:mt-20" : ""}>
                <Reveal delay={i * 0.08} className="flex h-full flex-col rounded-xl border border-dc-line bg-dc-white p-6 shadow-soft sm:p-7">
                  <span aria-hidden className="font-heading text-6xl leading-none text-dc-gold">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-heading text-[1.9rem] leading-tight text-dc-ink">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-dc-text-2">{s.body}</p>
                  <p className="mt-auto pt-5 text-sm font-semibold text-dc-clay">{s.fill}</p>
                </Reveal>
              </li>
            ))}
          </ol>

          <div className="mt-16 grid gap-10 border-t border-dc-line-strong pt-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h3 className="font-heading text-3xl text-dc-ink">Kategori yang bisa kamu pilih</h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {VENDOR_CATEGORIES.map((c) => (
                  <li key={c.value} className="rounded-full border border-dc-line-strong bg-dc-white px-4 py-2 text-sm font-semibold text-dc-ink">
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7">
              <h3 className="font-heading text-3xl text-dc-ink">Di dashboard vendor</h3>
              <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
                {DASHBOARD.map((d) => (
                  <div key={d.title} className="border-t border-dc-line py-4">
                    <dt className="font-semibold text-dc-ink">{d.title}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-dc-text-2">{d.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="dc-on-dark bg-dc-ink">
        <div className="dc-container grid gap-8 py-16 sm:py-20 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <h2 className="max-w-3xl font-heading text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] text-dc-on-dark">
              Aturan mainnya jelas sejak awal: <span className="dc-em-light">transaksi tetap di dalam platform.</span>
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-dc-on-dark/80">
              Setiap vendor terikat Perjanjian Kemitraan yang melarang transaksi di luar DuaCincin. Nomor telepon, email, dan tautan luar yang dibagikan di chat ditandai untuk ditinjau Admin, dan pelanggaran dikenai sanksi bertingkat. Baca isi lengkapnya sebelum mendaftar.
            </p>
            <Link
              href="/legal/vendor-agreement"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-dc-gold-antique underline decoration-dc-gold-antique/40 underline-offset-4 hover:decoration-dc-gold-antique"
            >
              Perjanjian Kemitraan Vendor
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
