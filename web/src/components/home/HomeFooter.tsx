// Footer: a champagne ground (marketplace style, text kept at 7:1+), the
// logo, the sister invitation product, link groups and the legal line.
import Link from "next/link";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { COMPANY, COMPANY_PAGE } from "@/lib/company";

const GROUPS = [
  {
    title: "Jelajahi",
    links: [
      { href: "/vendors", label: "Cari vendor" },
      { href: "/inspirasi", label: "Inspirasi" },
      { href: "/artikel", label: "Artikel pernikahan" },
      { href: "/cara-kerja", label: "Cara kerja escrow" },
    ],
  },
  {
    title: "DuaCincin",
    links: [
      { href: "/tentang-kami", label: "Tentang kami" },
      { href: "/untuk-vendor", label: "Untuk vendor" },
      { href: "/register?role=vendor", label: "Daftar sebagai vendor" },
      { href: "/bantuan", label: "Bantuan" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/client-tos", label: "Ketentuan layanan client" },
      { href: "/legal/vendor-agreement", label: "Perjanjian kemitraan vendor" },
      { href: "/kredit", label: "Kredit foto" },
    ],
  },
];

const LINK = "inline-flex min-h-9 items-center text-[0.93rem] text-wd-text transition-colors hover:text-wd-ink hover:underline underline-offset-4";

export function HomeFooter() {
  return (
    <footer className="bg-wd-champagne">
      <div className="wd-container pb-8 pt-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex rounded-md py-1">
              <BrandLogo size={30} />
            </Link>
            <p className="wd-display mt-6 max-w-sm text-[1.6rem] leading-snug">
              Vendor pilihan, pembayaran yang <em>tenang</em>, sampai hari-H.
            </p>
            <p className="mt-5 max-w-sm text-[0.93rem] leading-relaxed text-wd-text">
              Butuh undangan online?{" "}
              <a href="https://invitation.duacincin.id" className="font-semibold text-wd-accent-ink underline decoration-wd-accent-line underline-offset-4 hover:decoration-wd-accent-ink">
                DuaCincin Digital Invitation
              </a>
              , satu keluarga dengan DuaCincin.
            </p>
            <p className="mt-4 text-sm tabular-nums text-wd-text">
              No. TD PSE: <span className="font-semibold text-wd-ink">{COMPANY.pseNumber}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {GROUPS.map((g) => (
              <nav key={g.title} aria-label={g.title}>
                <p className="text-sm font-semibold text-wd-ink">{g.title}</p>
                <ul className="mt-3">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={LINK}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-[#e2d0aa] pt-6 text-sm text-wd-text sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} DuaCincin, dikelola{" "}
            <Link href={COMPANY_PAGE} className="underline decoration-wd-line-2 underline-offset-4 hover:text-wd-ink hover:underline underline-offset-4">
              {COMPANY.name}
            </Link>
            . Dibuat di Indonesia.
          </p>
          <div className="flex gap-6">
            <Link href="/login" className={LINK}>
              Masuk
            </Link>
            <Link href="/register" className={LINK}>
              Buat akun
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
