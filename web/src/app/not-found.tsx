import Link from "next/link";

import Image from "next/image";

import { wdButton } from "@/components/home/ui";
import { PublicShell } from "@/components/landing/PublicShell";
import { CATEGORY_THUMB } from "@/components/public/inspirasi/adat";
import { DidYouMean, type KnownPage } from "@/components/public/notfound/DidYouMean";
import { LIFT, ZOOM } from "@/components/public/shared/styles";
import { ARTICLES } from "@/content/artikel/registry";
import { VENDOR_CATEGORIES } from "@/lib/api";

export const metadata = { title: "Halaman tidak ditemukan" };

const PAGES = [
  { href: "/vendors", label: "Semua vendor" },
  { href: "/inspirasi", label: "Inspirasi" },
  { href: "/artikel", label: "Artikel" },
  { href: "/bantuan", label: "Bantuan" },
];

// Real public pages, for the "did you mean" hint on a mistyped address.
const KNOWN: KnownPage[] = [
  { path: "/vendors", label: "Semua vendor" },
  { path: "/inspirasi", label: "Inspirasi" },
  { path: "/artikel", label: "Artikel" },
  { path: "/bantuan", label: "Bantuan" },
  { path: "/cara-kerja", label: "Cara kerja escrow" },
  { path: "/untuk-vendor", label: "Untuk vendor" },
  { path: "/tentang-kami", label: "Tentang kami" },
  { path: "/kredit", label: "Kredit foto" },
  { path: "/legal/client-tos", label: "Ketentuan Layanan Client" },
  { path: "/legal/vendor-agreement", label: "Perjanjian Kemitraan Vendor" },
  { path: "/login", label: "Masuk" },
  { path: "/register", label: "Daftar" },
  ...ARTICLES.map((a) => ({ path: `/artikel/${a.slug}`, label: a.title })),
  ...VENDOR_CATEGORIES.map((c) => ({ path: `/kategori/${c.value}`, label: `Vendor ${c.label}` })),
];

// A 404 that helps: one short line, the vendor search (same `q` the
// directory reads), then categories and a few pages to continue from.
export default function NotFound() {
  return (
    <PublicShell>
      <div className="wd">
        <div className="wd-container max-w-[1000px] py-16 text-center sm:py-24">
          <p className="text-sm font-semibold text-wd-accent-ink">404</p>
          <h1 className="wd-title mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-tight">Halaman ini tidak ditemukan</h1>
          <p className="mx-auto mt-3 max-w-md text-wd-text">Mungkin alamatnya salah ketik atau halamannya sudah dipindah. Coba cari vendor di bawah.</p>
          <DidYouMean pages={KNOWN} />

          <form action="/vendors" method="get" role="search" aria-label="Cari vendor" className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-wd-line-2 bg-white p-1.5 pl-5 focus-within:border-wd-ink">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-wd-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <label htmlFor="nf-q" className="sr-only">
              Cari MUA, venue, katering, atau kota
            </label>
            <input id="nf-q" name="q" type="search" placeholder="Cari MUA, venue, katering, atau kota" className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-wd-ink placeholder:text-wd-muted focus:outline-none" />
            <button type="submit" className={wdButton({ size: "sm", className: "min-h-11" })}>
              Cari
            </button>
          </form>

          <nav aria-label="Kategori vendor" className="mt-12">
            <h2 className="text-sm font-semibold text-wd-ink">Atau pilih kategori</h2>
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {VENDOR_CATEGORIES.map((c) => (
                <li key={c.value}>
                  <Link href={`/kategori/${c.value}`} className={`group flex h-full flex-col overflow-hidden rounded-[16px] border border-wd-line bg-white text-left hover:border-wd-line-2 ${LIFT}`}>
                    <span className="relative block aspect-square overflow-hidden bg-wd-blush">
                      {CATEGORY_THUMB[c.value] && <Image src={CATEGORY_THUMB[c.value]} alt="" fill sizes="140px" className={ZOOM} />}
                    </span>
                    <span className="flex min-h-11 items-center px-2.5 py-2 text-[0.8rem] font-semibold leading-tight text-wd-ink sm:text-sm">{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Halaman lain" className="mt-8">
            <ul className="flex flex-wrap justify-center gap-x-6">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
                  Beranda
                </Link>
              </li>
              {PAGES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </PublicShell>
  );
}
