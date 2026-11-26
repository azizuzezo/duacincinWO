// Footer, marketplace layout (like Bridestory's): one champagne band with the
// link columns in a row, the social accounts at the right, then the logo and a
// bottom line with the legal links and the company line. The DuaCincin touch:
// the two social links are two interlocking rings (the brand's own motif) that
// slide a little apart on hover, and a faint pair of rings sits behind it all.
// Text stays at 7:1+ on the champagne ground.
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

const LINK = "inline-flex min-h-9 items-center text-[0.93rem] text-wd-text transition-colors hover:text-wd-ink hover:underline underline-offset-4";

/** A circular social link drawn as one ring of the pair. */
const RING =
  "relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-wd-accent bg-white text-wd-ink shadow-wd-card transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:z-10 hover:bg-wd-accent-wash hover:text-wd-accent-ink focus-visible:z-10 motion-reduce:transition-none";

export function HomeFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-wd-champagne">
      {/* Faint rings behind the footer: the logo's motif, decoration only. */}
      <svg aria-hidden viewBox="0 0 64 40" fill="none" className="pointer-events-none absolute -bottom-40 -right-32 -z-10 hidden h-[360px] w-[576px] text-wd-accent-line opacity-40 sm:block">
        <circle cx="24" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="40" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      <div className="wd-container pb-28 pt-14 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:gap-12">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[0.95rem] font-semibold text-wd-ink">{col.title}</p>
              <ul className="mt-3">
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
          <div>
            <p className="text-[0.95rem] font-semibold text-wd-ink">Ikuti kami</p>
            <div className="group/rings mt-3 flex items-center">
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram DuaCincin ${SOCIAL.handle} (tab baru)`}
                className={`${RING} group-hover/rings:-translate-x-1.5`}
              >
                <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                className={`${RING} -ml-4 group-hover/rings:translate-x-1.5`}
              >
                <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16.8 11.2c-.4-2.6-2.1-3.9-4.6-3.9-2.8 0-4.6 2-4.6 4.8 0 3 1.9 4.9 4.8 4.9 2.2 0 3.9-1.1 4.4-3 .5-2-1-3.2-3.2-3.2-1.8 0-3 .8-3 2.1 0 1.1 1 1.9 2.3 1.9 2.5 0 3.6-2.4 3.4-5.6" />
                  <path d="M19.6 7.5A8.7 8.7 0 0 0 12 3.5c-5 0-8.5 3.5-8.5 8.5s3.4 8.5 8.4 8.5c3.4 0 6-1.6 7.3-4.3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-[#e2d0aa] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex rounded-md py-1">
                <BrandLogo size={30} />
              </Link>
              <p className="mt-3 text-sm tabular-nums text-wd-text">
                No. TD PSE: <span className="font-semibold text-wd-ink">{COMPANY.pseNumber}</span>
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-wd-ink">
              <li>
                <Link href="/legal/client-tos" className="inline-flex min-h-9 items-center hover:underline underline-offset-4">
                  Ketentuan layanan client
                </Link>
              </li>
              <li>
                <Link href="/legal/vendor-agreement" className="inline-flex min-h-9 items-center hover:underline underline-offset-4">
                  Perjanjian kemitraan vendor
                </Link>
              </li>
              <li>
                <Link href="/kredit" className="inline-flex min-h-9 items-center hover:underline underline-offset-4">
                  Kredit foto
                </Link>
              </li>
            </ul>
          </div>
          <p className="text-sm text-wd-text">
            &copy; {new Date().getFullYear()} DuaCincin, dikelola{" "}
            <Link href={COMPANY_PAGE} className="underline decoration-wd-line-2 underline-offset-4 hover:text-wd-ink">
              {COMPANY.name}
            </Link>
            . Dibuat di Indonesia.
          </p>
        </div>
      </div>
    </footer>
  );
}
