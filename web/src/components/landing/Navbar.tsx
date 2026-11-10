"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { buttonClasses } from "@/components/ui/Button";
import { EASE, useReducedMotion } from "@/lib/motion";

const NAV_LINKS = [
  { href: "/vendors", label: "Cari vendor" },
  { href: "/cara-kerja", label: "Cara kerja" },
  { href: "/inspirasi", label: "Inspirasi" },
  { href: "/untuk-vendor", label: "Untuk vendor" },
];

/** Public header. `overlay`: transparent with light text over a full-bleed
 * hero, turns into solid ivory after the first scroll (the one blur on the
 * page). Mobile: the menu drops down as an ink panel. */
export function Navbar({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const light = overlay && !scrolled && !open;

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    // The open menu covers the page on phones: keep the page from scrolling underneath.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isCurrent = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <>
      <a href="#konten" className="dc-skip">
        Langsung ke konten
      </a>
      <header
        className={`${overlay ? "fixed inset-x-0" : "sticky"} top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ${
          light ? "border-b border-transparent bg-transparent" : open ? "border-b border-dc-ink-3 bg-dc-ink" : "border-b border-dc-line bg-dc-ivory/90 backdrop-blur-md"
        }`}
      >
        <div className="dc-container flex h-[72px] items-center justify-between gap-4">
          <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex min-h-11 items-center rounded-md">
            <BrandLogo size={26} tone={light || open ? "light" : "dark"} />
          </Link>

          <nav aria-label="Utama" className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const on = isCurrent(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={on ? "page" : undefined}
                  className={`group relative inline-flex min-h-11 items-center px-3.5 text-sm font-semibold transition-colors ${
                    light ? "text-dc-on-dark/90 hover:text-white" : on ? "text-dc-ink" : "text-dc-text-2 hover:text-dc-ink"
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={`absolute inset-x-3.5 bottom-2 h-px origin-left bg-current transition-transform duration-500 ease-dc ${on ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/login"
              className={`inline-flex min-h-11 items-center px-3 text-sm font-semibold transition-colors ${light ? "text-dc-on-dark hover:text-white" : "text-dc-ink hover:text-dc-clay"}`}
            >
              Masuk
            </Link>
            <Link href="/register" className={buttonClasses({ variant: light ? "light" : "primary", size: "sm", className: "px-5" })}>
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
            className={`-mr-2 flex h-11 w-11 items-center justify-center rounded-full lg:hidden ${light || open ? "text-dc-on-dark" : "text-dc-ink"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 9h16M4 15h11" />}
            </svg>
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              id="menu-mobile"
              className="dc-on-dark overflow-hidden bg-dc-ink lg:hidden"
              initial={reduced ? { opacity: 0 } : { height: 0 }}
              animate={reduced ? { opacity: 1 } : { height: "auto" }}
              exit={reduced ? { opacity: 0 } : { height: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.45, ease: EASE }}
            >
              <div className="dc-container pb-6 pt-2">
                <nav aria-label="Menu seluler">
                  <ul>
                    {NAV_LINKS.map((link, i) => (
                      <motion.li
                        key={link.href}
                        initial={reduced ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: EASE }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          aria-current={isCurrent(link.href) ? "page" : undefined}
                          className="flex min-h-14 items-center justify-between border-b border-dc-ink-3 font-heading text-[1.9rem] text-dc-on-dark aria-[current=page]:text-dc-gold-antique"
                        >
                          {link.label}
                          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-dc-gold-antique">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </nav>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setOpen(false)} className={buttonClasses({ variant: "ghostLight", size: "md" })}>
                    Masuk
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className={buttonClasses({ variant: "gold", size: "md" })}>
                    Buat akun
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
