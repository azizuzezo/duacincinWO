"use client";

// Public header, marketplace style (two rows, like the big wedding
// marketplaces). Row 1: logo, a wide vendor search (plain GET to /vendors,
// works without JS), "Jadi vendor", Masuk and Daftar. Row 2: the site
// sections, with "Vendor" opening a mega menu of every category as a photo.
// Phones: logo + Masuk + menu on top, the search as a full-width second row;
// the menu is a full-screen sheet with a focus trap.
//
// Keyboard: the mega menu closes on Escape (focus goes back to its button),
// on an outside click, and when focus leaves it.
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { CATEGORY_ART, categoryThumb } from "@/components/vendor/directory/categoryArt";
import { VENDOR_CATEGORIES } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { ArrowRight, wdButton } from "./ui";

const LINKS = [
  { href: "/inspirasi", label: "Inspirasi" },
  { href: "/artikel", label: "Artikel" },
  { href: "/cara-kerja", label: "Cara kerja escrow" },
  { href: "/kirana", label: "Tanya Kirana" },
  { href: "/untuk-vendor", label: "Untuk vendor" },
];


function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Search({ id, className = "" }: { id: string; className?: string }) {
  return (
    <form action="/vendors" method="get" role="search" aria-label="Cari vendor" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Cari vendor, kategori, atau kota
      </label>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-wd-muted">
        <SearchIcon />
      </span>
      <input
        id={id}
        name="q"
        type="search"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Cari MUA, venue, katering, atau kota…"
        className="h-11 w-full rounded-full border border-wd-line-2 bg-wd-paper pl-11 pr-4 text-[0.95rem] text-wd-ink transition-[border-color,background-color] placeholder:text-wd-muted hover:border-wd-muted focus:border-wd-accent focus:bg-white"
      />
    </form>
  );
}

export function HomeNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [mega, setMega] = useState(false);
  const [open, setOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const megaBtn = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);

  useFocusTrap(open, sheetRef, () => setOpen(false));

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(false);
        megaBtn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMega(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [mega]);

  // Route change (a link inside the menus was followed): close both.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menus when the path changes
    setMega(false);
    setOpen(false);
  }, [pathname]);

  const current = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  const hoverOpen = () => {
    window.clearTimeout(closeTimer.current);
    setMega(true);
  };
  const hoverClose = () => {
    closeTimer.current = window.setTimeout(() => setMega(false), 160);
  };

  return (
    <>
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-wd-ink focus:px-4 focus:py-2 focus:text-white">
        Langsung ke konten
      </a>
      <header data-wd-public className="sticky top-0 z-50 border-b border-wd-line bg-white">
        {/* Row 1 */}
        <div className="wd-container flex h-16 items-center gap-4 lg:gap-8">
          <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex min-h-11 shrink-0 items-center rounded-md">
            <BrandLogo size={23} priority />
          </Link>
          <Search id="cari-atas" className="hidden flex-1 lg:block lg:max-w-[680px]" />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/register?role=vendor" className="hidden min-h-11 items-center px-2 text-[0.92rem] font-medium text-wd-text hover:text-wd-ink xl:inline-flex">
              Jadi vendor
            </Link>
            <Link href="/login" className={wdButton({ variant: "outline", size: "sm", className: "border-wd-accent px-5 !text-wd-accent-ink hover:!bg-wd-accent-wash" })}>
              Masuk
            </Link>
            <Link href="/register" className={wdButton({ size: "sm", className: "hidden px-5 sm:inline-flex" })}>
              Daftar
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              aria-expanded={open}
              aria-controls="menu-seluler"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-wd-ink lg:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: phones get the search, desktop gets the sections */}
        <div className="wd-container pb-3 lg:hidden">
          <Search id="cari-hp" />
        </div>
        <nav aria-label="Utama" className="hidden border-t border-wd-line lg:block">
          <div className="wd-container flex h-12 items-center gap-1">
            <div
              ref={megaRef}
              onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen()}
              onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
              onBlur={(e) => {
                if (!megaRef.current?.contains(e.relatedTarget as Node)) setMega(false);
              }}
            >
              <button
                ref={megaBtn}
                type="button"
                aria-expanded={mega}
                aria-controls="menu-vendor"
                onClick={() => setMega((v) => !v)}
                className={`-ml-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.92rem] font-medium transition-colors ${mega ? "text-wd-accent-ink" : "text-wd-text hover:text-wd-ink"}`}
              >
                Vendor
                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform duration-300 ${mega ? "rotate-180" : ""}`}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <AnimatePresence>
                {mega && (
                  <motion.div
                    id="menu-vendor"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.24, ease: EASE }}
                    className="absolute inset-x-0 top-full border-b border-wd-line bg-white shadow-wd-pop"
                  >
                    <div className="wd-container grid gap-8 py-7 lg:grid-cols-[1fr_260px]">
                      <ul className="grid grid-cols-4 gap-x-4 gap-y-5 xl:grid-cols-6">
                        {VENDOR_CATEGORIES.map((c) => {
                          const art = CATEGORY_ART[c.value];
                          return (
                            <li key={c.value}>
                              <Link href={`/kategori/${c.value}`} className="group block rounded-xl">
                                <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-wd-blush">
                                  {art && (
                                    <Image
                                      src={categoryThumb(c.value)!}
                                      alt=""
                                      fill
                                      sizes="180px"
                                      className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                                    />
                                  )}
                                </span>
                                <span className="mt-2 block text-sm font-medium text-wd-ink group-hover:text-wd-accent-ink">{c.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex flex-col justify-between rounded-2xl bg-wd-accent-wash p-6">
                        <p className="text-[1.05rem] font-semibold leading-snug text-wd-ink">Saring per kota dan kisaran harga di direktori.</p>
                        <Link href="/vendors" className={wdButton({ size: "sm", className: "mt-6 self-start" })}>
                          Buka direktori vendor
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current(l.href) ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-[0.92rem] font-medium text-wd-text transition-colors hover:text-wd-ink aria-[current=page]:text-wd-accent-ink"
              >
                {l.label}
                {l.href === "/kirana" && (
                  <span className="ml-1.5 rounded-full bg-wd-accent px-1.5 py-px text-[0.66rem] font-bold leading-4 text-wd-ink">AI</span>
                )}
              </Link>
            ))}
            <a
              href="https://invitation.duacincin.id"
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.92rem] font-medium text-wd-accent-ink hover:text-wd-accent-ink"
            >
              Digital Invitation
            </a>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={sheetRef}
            id="menu-seluler"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-white lg:hidden"
          >
            <div className="wd-container flex h-16 items-center justify-between">
              <BrandLogo size={23} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-wd-ink">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Menu seluler" className="wd-container pb-10 pt-2">
              <p className="text-sm font-semibold text-wd-ink">Kategori vendor</p>
              <ul className="mt-3 grid grid-cols-3 gap-3">
                {VENDOR_CATEGORIES.map((c) => {
                  const art = CATEGORY_ART[c.value];
                  return (
                    <li key={c.value}>
                      <Link href={`/kategori/${c.value}`} onClick={() => setOpen(false)} className="block">
                        <span className="relative block aspect-square overflow-hidden rounded-xl bg-wd-blush">
                          {art && <Image src={categoryThumb(c.value)!} alt="" fill sizes="120px" className="object-cover" />}
                        </span>
                        <span className="mt-1.5 block text-[0.8rem] font-medium leading-tight text-wd-ink">{c.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-6 border-t border-wd-line">
                {[{ href: "/vendors", label: "Semua vendor" }, ...LINKS].map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.25, ease: EASE }}
                  >
                    <Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-13 items-center border-b border-wd-line py-3 text-[1.05rem] font-medium text-wd-ink">
                      {l.label}
                    </Link>
                  </motion.li>
                ))}
                <li>
                  <a href="https://invitation.duacincin.id" className="flex min-h-13 items-center gap-2 border-b border-wd-line py-3 text-[1.05rem] font-medium text-wd-accent-ink">
                    Digital Invitation <ArrowRight size={14} />
                  </a>
                </li>
              </ul>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className={wdButton({ variant: "outline" })}>
                  Masuk
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className={wdButton()}>
                  Daftar gratis
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
