import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Button } from "@/components/ui/Button";
import { Rings } from "@/components/ui/Rings";
import { VENDOR_CATEGORIES } from "@/lib/api";
import { GoldArch } from "@/components/ornament/GoldArch";

export const metadata = { title: "Halaman tidak ditemukan" };

const PAGES = [
  { href: "/cara-kerja", label: "Cara kerja escrow", sub: "Di mana uangmu di setiap tahap" },
  { href: "/inspirasi", label: "Galeri inspirasi", sub: "Foto pernikahan sungguhan" },
  { href: "/bantuan", label: "Pusat bantuan", sub: "Jawaban pertanyaan umum" },
];

// PRD §10.6: a 404 that helps. The one visual is the gold wedding arch
// cutout: a gate that is ready, with no page behind it. One primary action:
// search vendors (same form fields as the home hero, so /vendors reads them).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main id="konten" className="dc-grain flex-1">
        <div className="dc-container grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-24">
          <div className="lg:col-span-7">
            <p className="dc-eyebrow">Halaman tidak ditemukan</p>
            <h1 className="mt-4 font-heading text-[clamp(2.6rem,6vw,4.75rem)] leading-[1] text-dc-ink">
              Gapuranya sudah siap, <span className="dc-em">halamannya belum ada.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-dc-text-2">
              Alamatnya mungkin salah ketik atau halamannya sudah dipindah. Lanjutkan dari pencarian vendor di bawah, atau kembali ke beranda.
            </p>

            <form action="/vendors" method="get" role="search" aria-label="Cari vendor" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-dc-line bg-dc-white p-2 shadow-lift sm:flex-row sm:items-center">
              <label htmlFor="nf-kategori" className="sr-only">
                Kategori
              </label>
              <select id="nf-kategori" name="category" defaultValue="" className="min-h-12 rounded-xl bg-dc-cream px-4 text-sm font-semibold text-dc-ink sm:w-44">
                <option value="">Semua kategori</option>
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <label htmlFor="nf-q" className="sr-only">
                Kota atau nama vendor
              </label>
              <input id="nf-q" name="q" type="search" placeholder="Kota atau nama vendor" className="min-h-12 flex-1 rounded-xl px-4 text-base text-dc-black placeholder:text-dc-text-3 focus:outline-none" />
              <Button type="submit" variant="gold" size="md">
                Cari vendor
              </Button>
            </form>

            <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
              Kembali ke beranda
            </Link>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:col-span-5" aria-hidden>
            <div className="absolute inset-x-6 bottom-6 top-10 rounded-t-full bg-[radial-gradient(120%_80%_at_50%_100%,#ead7ae_0%,#f3ecdf_60%,#faf6ef_100%)]" />
            <Rings className="absolute left-1/2 top-[46%] w-40 -translate-x-1/2 -translate-y-1/2 text-dc-gold" stroke="currentColor" strokeWidth={0.8} />
            <GoldArch className="relative h-auto w-full" />
            <p className="relative mt-2 text-center font-heading text-5xl leading-none text-dc-text-3">404</p>
          </div>
        </div>

        <div className="dc-container pb-16 sm:pb-24">
          <div className="dc-rule" />
          <div className="mt-10 grid gap-10 lg:grid-cols-12">
            <nav aria-label="Halaman lain" className="lg:col-span-7">
              <p className="text-sm font-semibold text-dc-text-3">Mungkin yang kamu cari</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {PAGES.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href} className="flex min-h-20 flex-col justify-center rounded-xl border border-dc-line bg-dc-white px-4 py-3 transition-[border-color,box-shadow] hover:border-dc-ink hover:shadow-soft">
                      <span className="font-semibold text-dc-ink">{p.label}</span>
                      <span className="text-xs text-dc-text-3">{p.sub}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Kategori vendor" className="lg:col-span-5">
              <p className="text-sm font-semibold text-dc-text-3">Atau langsung ke kategori</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {VENDOR_CATEGORIES.map((c) => (
                  <li key={c.value}>
                    <Link href={`/vendors?category=${c.value}`} className="inline-flex min-h-11 items-center rounded-full border border-dc-line-strong bg-dc-white px-4 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
