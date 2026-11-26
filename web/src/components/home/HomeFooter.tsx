// Footer, compact like Bridestory's: one short champagne band. Row 1: the link
// columns packed to the left and "Ikuti kami" at the right. Row 2, one line:
// logo, legal links, company line. The DuaCincin touch: the two social links
// are two interlocking rings (the brand motif) that slide a little apart on
// hover. Text stays at 7:1+ on the champagne ground.
import Link from "next/link";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { COMPANY, COMPANY_PAGE, SOCIAL } from "@/lib/company";

const COLUMNS = [
  {
    title: "DuaCincin",
    links: [
      { href: "/tentang-kami", label: "Tentang kami" },
      { href: "/bantuan", label: "Bantuan" },
      { href: "/cara-kerja", label: "Cara kerja Dana Aman" },
      { href: "https://invitation.duacincin.id", label: "Digital Invitation", external: true },
    ],
  },
  {
    title: "Calon pengantin",
    links: [
      { href: "/vendors", label: "Cari vendor" },
      { href: "/inspirasi", label: "Inspirasi" },
      { href: "/artikel", label: "Artikel pernikahan" },
      { href: "/#budget", label: "Hitung budget" },
    ],
  },
  {
    title: "Vendor",
    links: [
      { href: "/untuk-vendor", label: "Untuk vendor" },
      { href: "/register?role=vendor", label: "Daftar sebagai vendor" },
      { href: "/legal/vendor-agreement", label: "Perjanjian kemitraan" },
    ],
  },
] as const;

const LINK = "inline-flex min-h-10 items-center text-[0.84rem] text-wd-text transition-colors hover:text-wd-ink hover:underline underline-offset-4 sm:min-h-8";
const LEGAL = "inline-flex min-h-10 items-center text-[0.8rem] font-semibold text-wd-ink hover:underline underline-offset-4 sm:min-h-8";

/** One ring of the social pair. */
const RING =
  "relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-wd-accent bg-white text-wd-ink shadow-wd-card transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:z-10 hover:bg-wd-accent-wash hover:text-wd-accent-ink focus-visible:z-10 motion-reduce:transition-none";

export function HomeFooter() {
  return (
    <footer className="bg-wd-champagne">
      <div className="wd-container pb-16 pt-8 sm:pb-14">
        <div className="flex flex-wrap items-start gap-x-14 gap-y-5">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="min-w-[8.5rem]">
              <p className="text-[0.88rem] font-semibold text-wd-ink">{col.title}</p>
              <ul className="mt-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"external" in l && l.external ? (
                      <a href={l.href} className={LINK}>
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className={LINK}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Social: two interlocking rings. */}
          <div className="sm:ml-auto">
            <p className="text-[0.88rem] font-semibold text-wd-ink">Ikuti kami</p>
            <div className="group/rings mt-2 flex items-center">
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram DuaCincin ${SOCIAL.handle} (tab baru)`}
                className={`${RING} group-hover/rings:-translate-x-1`}
              >
                <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                className={`${RING} -ml-3.5 group-hover/rings:translate-x-1`}
              >
                <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16.8 11.2c-.4-2.6-2.1-3.9-4.6-3.9-2.8 0-4.6 2-4.6 4.8 0 3 1.9 4.9 4.8 4.9 2.2 0 3.9-1.1 4.4-3 .5-2-1-3.2-3.2-3.2-1.8 0-3 .8-3 2.1 0 1.1 1 1.9 2.3 1.9 2.5 0 3.6-2.4 3.4-5.6" />
                  <path d="M19.6 7.5A8.7 8.7 0 0 0 12 3.5c-5 0-8.5 3.5-8.5 8.5s3.4 8.5 8.4 8.5c3.4 0 6-1.6 7.3-4.3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* One line: logo, legal links, company. */}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-[#e2d0aa] pt-3">
          <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex rounded-md py-1">
            <BrandLogo size={22} />
          </Link>
          <Link href="/legal/client-tos" className={LEGAL}>
            Ketentuan layanan client
          </Link>
          <Link href="/legal/vendor-agreement" className={LEGAL}>
            Perjanjian kemitraan vendor
          </Link>
          <Link href="/kredit" className={LEGAL}>
            Kredit foto
          </Link>
          <p className="text-[0.78rem] tabular-nums text-wd-text lg:ml-auto">
            &copy; {new Date().getFullYear()} DuaCincin, dikelola{" "}
            <Link href={COMPANY_PAGE} className="underline decoration-wd-line-2 underline-offset-4 hover:text-wd-ink">
              {COMPANY.name}
            </Link>
            . No. TD PSE: <span className="font-semibold text-wd-ink">{COMPANY.pseNumber}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
