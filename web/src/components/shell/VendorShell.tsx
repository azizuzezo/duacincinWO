"use client";

// The signed-in vendor's frame, in the same marketplace spirit as the client
// area: a white header with the account corner, one row of sections with an
// underline that glides to the active one, and a bottom tab bar on phones
// (vendors answer requests between jobs). Same props as the old Shell, so a
// vendor page only swaps the component.
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccountMenu } from "@/components/home/AccountMenu";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import type { CurrentUser } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

import { VENDOR_NAV } from "./navConfig";
import type { NavItem } from "./Shell";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink";

/** Active on its own href or any `match` prefix; the longest hit wins. */
function activeHref(items: NavItem[], pathname: string | null): string | null {
  if (!pathname) return null;
  let best: { href: string; len: number } | null = null;
  for (const item of items) {
    for (const p of [item.href, ...(item.match ?? [])]) {
      if ((pathname === p || pathname.startsWith(`${p}/`)) && (!best || p.length > best.len)) best = { href: item.href, len: p.length };
    }
  }
  return best?.href ?? null;
}

function NavIcon({ paths, size = 20 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function VendorShell({ user, children }: { user: CurrentUser; navItems?: NavItem[]; loginPath?: string; eyebrow?: string; tone?: "wd"; children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const items = VENDOR_NAV;
  const active = activeHref(items, pathname);
  const tabs = items.filter((i) => i.tab).slice(0, 4);
  const more = items.filter((i) => !tabs.includes(i));
  const moreActive = !!active && more.some((i) => i.href === active);
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(moreOpen, sheetRef, () => setMoreOpen(false));

  useEffect(() => {
    queueMicrotask(() => setMoreOpen(false));
  }, [pathname]);

  return (
    <div data-wd-public className="wd dc-app flex min-h-svh flex-col bg-white">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-wd-ink focus:px-4 focus:py-2 focus:text-white">
        Langsung ke konten
      </a>
      <header className="sticky top-0 z-50 border-b border-wd-line bg-white">
        <div className="wd-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/vendor/dashboard" aria-label="DuaCincin, pusat vendor" className={`inline-flex min-h-11 items-center rounded-md ${FOCUS}`}>
              <BrandLogo size={26} />
            </Link>
            <span className="hidden rounded-full bg-wd-accent-soft px-3 py-1 text-[0.78rem] font-semibold text-wd-accent-ink sm:inline-block">Pusat vendor</span>
          </div>
          <AccountMenu user={user} />
        </div>
        {/* Sections (tablet and up); phones use the bottom bar. */}
        <nav aria-label="Menu vendor" className="wd-container hidden md:block">
          <ul className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {items.map((item) => {
              const on = item.href === active;
              return (
                <li key={item.href} className="relative shrink-0">
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={`relative inline-flex min-h-12 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${FOCUS}`}
                  >
                    <span className={on ? "text-wd-accent-ink" : "text-wd-muted"}>
                      <NavIcon paths={item.icon} size={18} />
                    </span>
                    {item.label}
                    {on && <motion.span layoutId={reduced ? undefined : "vendor-underline"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main id="konten" tabIndex={-1} className="min-w-0 flex-1 bg-white pb-[calc(5.5rem+env(safe-area-inset-bottom))] focus:outline-none md:pb-0">
        <div className="dc-page-enter">{children}</div>
      </main>

      <footer className="hidden border-t border-wd-line py-5 md:block">
        <div className="wd-container flex flex-wrap items-center justify-between gap-3 text-sm text-wd-muted">
          <span>Pusat vendor DuaCincin</span>
          <span className="flex gap-5">
            <Link href="/bantuan" className={`underline-offset-4 hover:text-wd-ink hover:underline ${FOCUS}`}>
              Bantuan
            </Link>
            <Link href="/legal/vendor-agreement" className={`underline-offset-4 hover:text-wd-ink hover:underline ${FOCUS}`}>
              Perjanjian kemitraan
            </Link>
          </span>
        </div>
      </footer>

      {/* Phones: four destinations plus "Lainnya". 56px targets. */}
      <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-wd-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {tabs.map((item) => {
          const on = item.href === active;
          return (
            <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-wd-accent-ink" : "text-wd-muted"} ${FOCUS}`}>
              {on && <motion.span layoutId={reduced ? undefined : "vendor-tab"} transition={SPRING_SNAPPY} aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-wd-accent-deep" />}
              <NavIcon paths={item.icon} size={21} />
              <span className="max-w-full truncate px-1">{item.short ?? item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} aria-controls="vendor-more" className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${moreActive ? "text-wd-accent-ink" : "text-wd-muted"} ${FOCUS}`}>
          {moreActive && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-wd-accent-deep" />}
          <svg aria-hidden width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
          Lainnya
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.button type="button" tabIndex={-1} aria-label="Tutup menu" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-wd-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              ref={sheetRef}
              id="vendor-more"
              role="dialog"
              aria-modal="true"
              aria-label="Menu lainnya"
              className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-white p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
              initial={reduced ? { opacity: 0 } : { y: "100%" }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: reduced ? 0.01 : 0.34, ease: EASE }}
            >
              <ul>
                {more.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setMoreOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.98rem] font-semibold text-wd-ink hover:bg-wd-accent-wash ${FOCUS}`}>
                      <span className="text-wd-accent-ink">
                        <NavIcon paths={item.icon} />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
