"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

const TABS = [
  { href: "/vendor/profile", label: "Profil", hint: "Siapa kamu" },
  { href: "/vendor/portfolio", label: "Portofolio", hint: "Hasil kerjamu" },
  { href: "/vendor/paket", label: "Paket harga", hint: "Pilihan & harga" },
];

/** The three pages that build the vendor's shop window, in the order a couple
 * reads them, plus a jump to what couples actually see. `publicId` is passed
 * only when the profile is approved: a pending profile 404s publicly, so the
 * link would be a dead end. `status` lets the strip explain why it is missing. */
export function EtalaseTabs({
  publicId,
  status,
}: {
  publicId?: string;
  status?: "pending" | "approved" | "rejected" | null;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-dc-line sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <nav aria-label="Bagian etalase" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1 sm:gap-2">
          {TABS.map((t, i) => {
            const active = pathname === t.href;
            return (
              <li key={t.href} className="relative">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-14 items-center gap-3 rounded-t-md px-3 pb-3 pt-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold sm:px-4 ${
                    active ? "text-dc-ink" : "text-dc-text-2 hover:text-dc-ink"
                  }`}
                >
                  {/* Serif numeral: the three pages read as chapters of one storefront. */}
                  <span
                    aria-hidden
                    className={`font-heading text-[1.65rem] italic leading-none transition-colors ${active ? "text-dc-clay" : "text-dc-text-3 group-hover:text-dc-clay"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[0.95rem] font-semibold">{t.label}</span>
                    <span className="hidden text-xs text-dc-text-3 sm:block">{t.hint}</span>
                  </span>
                </Link>
                {active && (
                  // Shared-layout underline glides between chapters so the move reads as one place, not three pages.
                  <motion.span
                    layoutId={reduced ? undefined : "etalase-underline"}
                    transition={SPRING_SNAPPY}
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-dc-gold"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="pb-3">
        {publicId ? (
          <Link
            href={`/vendors/${publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-dc-line-strong bg-dc-white px-4 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-dc-clay">
              <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
            Lihat etalase publik
            <span className="sr-only">(buka di tab baru)</span>
          </Link>
        ) : status === "pending" ? (
          <p className="max-w-xs text-sm text-dc-text-2">Etalase publik tampil setelah profilmu disetujui tim DuaCincin.</p>
        ) : status === "rejected" ? (
          <p className="max-w-xs text-sm text-dc-text-2">Etalase publik belum tampil. Catatan dari tim ada di halaman Profil.</p>
        ) : null}
      </div>
    </div>
  );
}
