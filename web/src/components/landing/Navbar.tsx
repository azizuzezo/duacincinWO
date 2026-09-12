"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/vendors", label: "Cari Vendor" },
  { href: "/inspirasi", label: "Inspirasi" },
  { href: "/#budget-demo", label: "Budget Planner" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  // Plain hash links only trigger the browser's native anchor-jump when the
  // URL hash actually changes, so clicking "Budget Planner" a second time
  // (hash already matches) silently did nothing. Scrolling manually here
  // works every time, regardless of the current hash.
  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("/#")) return;
    if (typeof window === "undefined" || window.location.pathname !== "/") return;
    const id = href.slice(2);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-dc-black/5 bg-dc-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/duacincin-logo.webp" alt="DuaCincin" width={32} height={32} priority />
          <span className="font-heading text-lg font-extrabold text-dc-navy">DuaCincin</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-dc-navy/80 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="transition hover:text-dc-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-semibold text-dc-navy hover:text-dc-gold">
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-dc-navy px-5 py-2 text-sm font-semibold text-dc-white transition hover:bg-dc-gold hover:text-dc-navy"
          >
            Daftar Gratis
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Buka menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-dc-navy md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-dc-black/5 bg-dc-white px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-dc-navy hover:bg-dc-offwhite"
              onClick={(e) => {
                setOpen(false);
                handleAnchorClick(e, link.href);
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-dc-black/5 pt-3">
            <Link href="/login" className="flex-1 rounded-full border border-dc-navy/20 px-4 py-2 text-center text-sm font-semibold text-dc-navy">
              Masuk
            </Link>
            <Link href="/register" className="flex-1 rounded-full bg-dc-navy px-4 py-2 text-center text-sm font-semibold text-dc-white">
              Daftar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
