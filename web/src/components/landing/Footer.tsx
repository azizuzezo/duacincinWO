import Image from "next/image";
import Link from "next/link";

import { Rings } from "@/components/landing/Rings";

const LINKS = [
  { href: "/vendors", label: "Cari vendor" },
  { href: "/inspirasi", label: "Inspirasi" },
  { href: "/register?role=vendor", label: "Daftar sebagai vendor" },
  { href: "/login", label: "Masuk" },
];

const LEGAL = [
  { href: "/legal/client-tos", label: "Ketentuan layanan client" },
  { href: "/legal/vendor-agreement", label: "Perjanjian kemitraan vendor" },
];

const LINK = "inline-flex min-h-11 items-center text-sm text-dc-ink/80 underline-offset-4 hover:text-dc-clay hover:underline focus-visible:outline-2 focus-visible:outline-dc-ink";

export function Footer() {
  return (
    <footer className="bg-dc-ivory">
      <div className="dc-rule mx-auto max-w-[1200px]" />
      <div className="mx-auto max-w-[1200px] px-4 pb-8 pt-14 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/brand/duacincin-logo.webp" alt="" width={36} height={36} />
              <span className="font-heading text-4xl text-dc-ink sm:text-5xl">DuaCincin</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-dc-ink/70">
              Direktori vendor pernikahan, budget planner, dan pembayaran escrow untuk pasangan Indonesia.
            </p>
          </div>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-6">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} className={LINK}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-dc-ink/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-xs text-dc-ink/70">
            <Rings className="h-5 w-8" />
            <span>&copy; {new Date().getFullYear()} DuaCincin</span>
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className={LINK}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
