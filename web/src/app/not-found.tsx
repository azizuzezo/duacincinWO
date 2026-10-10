import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { VENDOR_CATEGORIES } from "@/lib/api";

export const metadata = { title: "Halaman tidak ditemukan" };

// PRD §10.6: a 404 that helps: way home plus a way to keep browsing.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <p className="text-sm font-semibold text-dc-clay">Kode 404</p>
        <h1 className="font-heading mt-3 max-w-3xl text-5xl leading-[1.05] text-dc-ink sm:text-6xl">
          Halaman ini <span className="dc-em">tidak ada</span>
        </h1>
        <p className="mt-5 max-w-lg text-dc-black/70">
          Alamatnya mungkin salah ketik atau halamannya sudah dipindah. Kamu bisa kembali ke beranda atau langsung
          cari vendor.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md bg-dc-ink px-6 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay"
          >
            Kembali ke beranda
          </Link>
          <Link
            href="/vendors"
            className="inline-flex min-h-11 items-center rounded-md border border-dc-ink/25 px-6 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink hover:bg-dc-white"
          >
            Cari vendor
          </Link>
        </div>
        <div className="dc-rule mt-14" />
        <p className="mt-6 text-sm text-dc-black/70">Atau langsung ke kategori:</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {VENDOR_CATEGORIES.map((c) => (
            <li key={c.value}>
              <Link
                href={`/vendors?category=${c.value}`}
                className="inline-flex min-h-11 items-center rounded-md border border-dc-ink/20 px-4 text-sm text-dc-ink transition-colors hover:border-dc-ink hover:bg-dc-white"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
