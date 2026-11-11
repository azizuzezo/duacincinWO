import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";
import { BrandLogo } from "@/components/ui/BrandLogo";

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
];

const LINK = "inline-flex min-h-11 items-center text-sm text-dc-on-dark/80 transition-colors hover:text-dc-gold-antique";

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
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex rounded-md py-1">
              <BrandLogo size={34} tone="light" />
            </Link>
            <p className="mt-6 max-w-md font-heading text-[2rem] leading-[1.1] text-dc-on-dark">
              Vendor pilihan, pembayaran yang <span className="dc-em-light">tenang</span>, sampai hari-H.
            </p>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-dc-on-dark/75">
              Butuh undangan digital juga? Buat di{" "}
              <a
                href="https://invitation.duacincin.id"
                className="font-semibold text-dc-gold-antique underline decoration-dc-gold-antique/40 underline-offset-4 hover:decoration-dc-gold-antique"
              >
                DuaCincin Undangan
              </a>
              , satu keluarga dengan DuaCincin.
            </p>
          </Reveal>
          <nav aria-label="Jelajahi" className="lg:col-span-3">
            <p className="text-xs font-semibold text-dc-gold-antique">Jelajahi</p>
            <ul className="mt-3">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Bantuan dan legal" className="lg:col-span-3">
            <p className="text-xs font-semibold text-dc-gold-antique">Bantuan dan legal</p>
            <ul className="mt-3">
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
        <div className="mt-14 flex flex-col gap-3 border-t border-dc-ink-3 pt-6 text-xs text-dc-on-dark/70 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} DuaCincin. Dibuat di Indonesia.</p>
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
