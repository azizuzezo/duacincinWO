"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/vendors", label: "Cari vendor" },
  { href: "/inspirasi", label: "Inspirasi" },
  { href: "/#budget-demo", label: "Budget planner" },
];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink";

/** `overlay`: sits transparent over a full-bleed hero photo with light text,
 * and turns solid after the first scroll (the one blur on the page). */
export function Navbar({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const light = overlay && !scrolled && !open;

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Re-clicking a hash link whose hash already matches does nothing natively,
  // so scroll manually when we are already on the landing page.
  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    setOpen(false);
    if (!href.startsWith("/#")) return;
    if (window.location.pathname !== "/") return;
    const el = document.getElementById(href.slice(2));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
  }

  return (
    <header
      className={`${overlay ? "fixed inset-x-0" : "sticky"} top-0 z-50 transition-colors duration-300 ${
        light ? "border-b border-transparent bg-transparent" : "border-b border-dc-ink/10 bg-dc-ivory/90 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className={`flex min-h-14 items-center gap-2.5 ${FOCUS}`}>
          <Image src="/brand/duacincin-logo.webp" alt="" width={30} height={30} priority />
          <span className={`font-heading text-xl transition-colors ${light ? "text-dc-white" : "text-dc-ink"}`}>DuaCincin</span>
        </Link>

        <nav aria-label="Utama" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className={`inline-flex min-h-11 items-center text-sm font-medium transition-colors ${light ? "text-dc-white/90 hover:text-dc-white" : "text-dc-ink/80 hover:text-dc-clay"} ${FOCUS}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className={`inline-flex min-h-11 items-center px-3 text-sm font-semibold transition-colors ${light ? "text-dc-white" : "text-dc-ink hover:text-dc-clay"} ${FOCUS}`}
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className={`inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors ${light ? "bg-dc-white text-dc-ink hover:bg-dc-gold-antique" : "bg-dc-ink text-dc-white hover:bg-dc-clay"} ${FOCUS}`}
          >
            Buat akun
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          aria-controls="menu-mobile"
          className={`-mr-2 flex h-11 w-11 items-center justify-center rounded-md md:hidden ${light ? "text-dc-white" : "text-dc-ink"} ${FOCUS}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-dc-ink/10 bg-dc-ivory px-4 pb-4 pt-2 md:hidden">
          <nav aria-label="Menu seluler" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className={`flex min-h-12 items-center border-b border-dc-ink/10 font-heading text-2xl text-dc-ink ${FOCUS}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={`inline-flex min-h-11 items-center justify-center rounded-md border border-dc-ink/25 text-sm font-semibold text-dc-ink ${FOCUS}`}
            >
              Masuk
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className={`inline-flex min-h-11 items-center justify-center rounded-md bg-dc-ink text-sm font-semibold text-dc-white ${FOCUS}`}
            >
              Buat akun
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
