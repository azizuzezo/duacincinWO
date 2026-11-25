// Footer: a champagne ground (marketplace style, text kept at 7:1+), the
// logo, the sister invitation product, social accounts, link groups and
// the legal line.
import Link from "next/link";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { COMPANY, COMPANY_PAGE, SOCIAL } from "@/lib/company";

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
      <div className="wd-container pb-28 pt-16 sm:pt-20">
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
          <div className="flex items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-wd-ink">Ikuti kami</span>
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram DuaCincin ${SOCIAL.handle} (tab baru)`}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-wd-ink ring-1 ring-[#e2d0aa] transition-[color,box-shadow,transform] duration-300 hover:text-wd-accent-ink hover:shadow-wd-card motion-safe:hover:-translate-y-0.5"
            >
              <svg aria-hidden width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href={SOCIAL.threads}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Threads DuaCincin ${SOCIAL.handle} (tab baru)`}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-wd-ink ring-1 ring-[#e2d0aa] transition-[color,box-shadow,transform] duration-300 hover:text-wd-accent-ink hover:shadow-wd-card motion-safe:hover:-translate-y-0.5"
            >
              <svg aria-hidden width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.8 11.2c-.4-2.6-2.1-3.9-4.6-3.9-2.8 0-4.6 2-4.6 4.8 0 3 1.9 4.9 4.8 4.9 2.2 0 3.9-1.1 4.4-3 .5-2-1-3.2-3.2-3.2-1.8 0-3 .8-3 2.1 0 1.1 1 1.9 2.3 1.9 2.5 0 3.6-2.4 3.4-5.6" />
                <path d="M19.6 7.5A8.7 8.7 0 0 0 12 3.5c-5 0-8.5 3.5-8.5 8.5s3.4 8.5 8.4 8.5c3.4 0 6-1.6 7.3-4.3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
