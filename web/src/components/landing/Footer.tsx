import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { COMPANY, COMPANY_PAGE } from "@/lib/company";

const EXPLORE = [
  { href: "/vendors", label: "Cari vendor" },
  { href: "/cara-kerja", label: "Cara kerja escrow" },
  { href: "/inspirasi", label: "Inspirasi" },
  { href: "/untuk-vendor", label: "Untuk vendor" },
];

const HELP = [
  { href: "/bantuan", label: "Bantuan" },
  { href: "/legal/client-tos", label: "Ketentuan layanan client" },
  { href: "/legal/vendor-agreement", label: "Perjanjian kemitraan vendor" },
  { href: "/kredit", label: "Kredit foto" },
  { href: COMPANY_PAGE, label: "Informasi perusahaan" },
];

const LINK = "inline-flex min-h-10 items-center text-[0.95rem] font-medium text-dc-on-dark/90 underline-offset-4 transition-colors hover:text-dc-gold-antique hover:underline";
const GROUP = "border-b border-dc-on-dark/15 pb-3 text-sm font-semibold text-dc-gold-antique";

/** Ink footer: one closing line, two short link groups, and the sister
 * product (digital invitations) that shares the DuaCincin brand. */
export function Footer() {
  return (
    <footer className="dc-on-dark relative isolate overflow-hidden bg-dc-ink text-dc-on-dark">
      <svg aria-hidden viewBox="0 0 64 40" fill="none" className="absolute -bottom-40 -right-24 -z-10 h-[420px] w-[680px] opacity-[0.1]">
        <circle cx="24" cy="20" r="16" stroke="var(--dc-gold-antique)" strokeWidth="0.22" />
        <circle cx="40" cy="20" r="16" stroke="var(--dc-gold-antique)" strokeWidth="0.22" />
      </svg>
      <div className="dc-container pb-8 pt-16 sm:pt-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <Reveal className="sm:col-span-2 lg:col-span-6">
            <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex rounded-md py-1">
              <BrandLogo size={34} tone="light" />
            </Link>
            <p className="mt-6 max-w-md font-heading text-[2rem] leading-[1.1] text-dc-on-dark">
              Vendor pilihan, pembayaran yang <span className="dc-em-light">tenang</span>, sampai hari-H.
            </p>
            <p className="mt-6 max-w-md text-[0.95rem] leading-7 text-dc-on-dark/90">
              Butuh undangan digital juga? Buat di{" "}
              <a
                href="https://invitation.duacincin.id"
                className="font-semibold text-dc-gold-antique underline decoration-dc-gold-antique/40 underline-offset-4 hover:decoration-dc-gold-antique"
              >
                DuaCincin Undangan
              </a>
              , satu keluarga dengan DuaCincin.
            </p>
            <p className="mt-4 text-sm tabular-nums text-dc-on-dark/80">
              No. TD PSE: <strong className="font-semibold text-dc-on-dark">{COMPANY.pseNumber}</strong>
            </p>
          </Reveal>
          <nav aria-label="Jelajahi" className="lg:col-span-2 lg:col-start-8">
            <p className={GROUP}>Jelajahi</p>
            <ul className="mt-3 space-y-0.5">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Bantuan dan legal" className="lg:col-span-3 lg:col-start-10">
            <p className={GROUP}>Bantuan dan legal</p>
            <ul className="mt-3 space-y-0.5">
              {HELP.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-dc-on-dark/15 pt-6 text-sm text-dc-on-dark/80 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} DuaCincin, dikelola{" "}
            <Link href={COMPANY_PAGE} className="underline decoration-dc-on-dark/40 underline-offset-4 transition-colors hover:text-dc-gold-antique hover:decoration-dc-gold-antique">
              {COMPANY.name}
            </Link>
            . Dibuat di Indonesia.
          </p>
          <div className="flex gap-x-6">
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
