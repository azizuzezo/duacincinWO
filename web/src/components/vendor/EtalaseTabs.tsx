"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/vendor/profile", label: "Profil" },
  { href: "/vendor/portfolio", label: "Portofolio" },
  { href: "/vendor/paket", label: "Paket harga" },
];

/** The three pages that make up the vendor's public storefront, plus a jump
 * to what clients actually see. `publicId` is passed only when the profile is
 * approved: a pending profile 404s publicly, so the link would be a dead end. */
export function EtalaseTabs({ publicId }: { publicId?: string }) {
  const pathname = usePathname();
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Bagian etalase" className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                active ? "border-dc-clay text-dc-ink" : "border-transparent text-dc-black/70 hover:text-dc-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {publicId && (
        <Link
          href={`/vendors/${publicId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
        >
          Lihat tampilan publik (tab baru)
        </Link>
      )}
    </div>
  );
}
