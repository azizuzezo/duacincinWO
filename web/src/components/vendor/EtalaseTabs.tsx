"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

const TABS = [
  { href: "/vendor/profile", label: "Profil" },
  { href: "/vendor/portfolio", label: "Portofolio" },
  { href: "/vendor/paket", label: "Paket" },
];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

/** Underline tabs for the three pages of the vendor's shop. `publicId` is
 * passed only when the profile is approved: a pending profile 404s publicly,
 * so the link would be a dead end. `status` explains why it is missing. */
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
    <div className="mt-6 flex flex-col gap-3 border-b border-wd-line sm:flex-row sm:items-end sm:justify-between">
      <nav aria-label="Bagian etalase">
        <ul className="flex gap-1 sm:gap-3">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <li key={t.href} className="relative">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center rounded-t-lg px-3 text-[0.95rem] font-semibold transition-colors sm:px-4 ${FOCUS} ${active ? "text-wd-ink" : "text-wd-muted hover:text-wd-ink"}`}
                >
                  {t.label}
                </Link>
                {active && (
                  <motion.span
                    layoutId={reduced ? undefined : "etalase-underline"}
                    transition={SPRING_SNAPPY}
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-wd-ink"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pb-3">
        {publicId ? (
          <Link
            href={`/vendors/${publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-wd-ink underline-offset-4 hover:underline ${FOCUS}`}
          >
            Lihat etalase publik
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
            <span className="sr-only">(buka di tab baru)</span>
          </Link>
        ) : status === "pending" ? (
          <p className="text-sm text-wd-text">Etalase publik tampil setelah profilmu disetujui.</p>
        ) : status === "rejected" ? (
          <p className="text-sm text-wd-text">Catatan dari tim ada di halaman Profil.</p>
        ) : null}
      </div>
    </div>
  );
}
