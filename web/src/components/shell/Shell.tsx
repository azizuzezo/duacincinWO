"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { forgetCurrentUser } from "@/components/WithUser";
import { apiPost, type CurrentUser } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";
import { useAdminQueues, type AdminQueues } from "@/lib/useAdminQueues";

/** `short` is the label used in the mobile bottom tab bar, where 5 tabs leave ~70px each;
 * `tab` marks the (up to 4) destinations promoted to that bar, the rest live under "Lainnya". */
export type NavItem = { href: string; label: string; short?: string; tab?: boolean; match?: string[]; group?: string; icon: readonly string[]; badgeCount?: number };

function initials(user: CurrentUser): string {
  const source = user.full_name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Active on its own href, or on any `match` prefix (grouped pages like Etalase).
 * The longest matching href wins so "/internal/admin/vendors/approved" does not
 * also light up "/internal/admin/vendors". */
function activeHref(items: NavItem[], pathname: string | null): string | null {
  if (!pathname) return null;
  let best: { href: string; len: number } | null = null;
  for (const item of items) {
    const prefixes = [item.href, ...(item.match ?? [])];
    for (const p of prefixes) {
      const hit = pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`);
      if (hit && (!best || p.length > best.len)) best = { href: item.href, len: p.length };
    }
  }
  return best?.href ?? null;
}

const QUEUE_BY_HREF: Record<string, keyof AdminQueues> = {
  "/internal/admin/disputes": "disputes",
  "/internal/admin/disbursements": "disbursements",
  "/internal/admin/vendors": "vendors",
  "/internal/admin/vendor-name-changes": "nameChanges",
};

/** Adds open-work counts to the admin nav entries (see useAdminQueues). */
function withQueueBadges(navItems: NavItem[], queues: AdminQueues | null): NavItem[] {
  if (!queues) return navItems;
  return navItems.map((i) => {
    const key = QUEUE_BY_HREF[i.href];
    return key && queues[key] > 0 ? { ...i, badgeCount: queues[key] } : i;
  });
}

function NavIcon({ paths, size = 19 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Open-work count: a small ink pill, calm next to the gold active state. */
function Count({ n }: { n: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-dc-ink px-1.5 text-[11px] font-bold tabular-nums text-dc-on-dark">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Sidebar links (desktop sidebar and mobile drawer, both on the light sidebar paper). */
function NavLinks({ navItems, active, onNavigate, layoutId }: { navItems: NavItem[]; active: string | null; onNavigate?: () => void; layoutId: string }) {
  const reduced = useReducedMotion();
  return (
    <ul className="flex flex-col gap-0.5">
      {navItems.map((item, i) => {
        const on = item.href === active;
        const heading = item.group && item.group !== navItems[i - 1]?.group ? item.group : null;
        return (
          <li key={item.href}>
            {heading && <p className="px-3 pb-1.5 pt-5 text-xs font-semibold text-dc-text-3">{heading}</p>}
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-offset-0 ${
                on ? "text-dc-ink" : "text-dc-text-2 hover:bg-dc-cream hover:text-dc-ink"
              }`}
            >
              {on && (
                <motion.span
                  layoutId={reduced ? undefined : layoutId}
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute inset-0 rounded-md bg-dc-gold-wash ring-1 ring-inset ring-dc-gold/30"
                />
              )}
              <span className="relative flex flex-1 items-center gap-3">
                <span className={on ? "text-dc-clay" : undefined}>
                  <NavIcon paths={item.icon} />
                </span>
                <span className={`flex-1 ${on ? "font-semibold" : ""}`}>{item.label}</span>
                {!!item.badgeCount && <Count n={item.badgeCount} />}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserCard({ user, eyebrow, onLogout }: { user: CurrentUser; eyebrow?: string; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dc-line bg-dc-surface p-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dc-gold/60 bg-dc-gold-wash font-heading text-base font-semibold text-dc-clay">
        {initials(user)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-dc-ink">{user.full_name || user.email}</p>
        {eyebrow && <p className="text-xs text-dc-text-3">{eyebrow}</p>}
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Keluar"
        title="Keluar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-2 transition-colors hover:bg-dc-cream hover:text-dc-ink"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </div>
  );
}

/** Shared authenticated-area shell (client, vendor, admin, consultant).
 * Desktop (lg, 1024px+): light paper sidebar with a champagne active state
 * (ink stays for primary buttons and the one focal block per page). Phones and tablets (below lg, so a 768px tablet keeps
 * its full width for content): light top bar, bottom tab bar with the four
 * main destinations plus "Lainnya" that opens the full menu as a drawer.
 * Page content goes in `children`; it lands in <main id="konten">. */
export function Shell({
  user,
  navItems,
  eyebrow,
  children,
}: {
  user: CurrentUser;
  navItems: NavItem[];
  /** Kept for callers; logging out now always lands on the home page. */
  loginPath?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { queues } = useAdminQueues(user.role === "admin");
  const items = withQueueBadges(navItems, queues);
  const flagged = items.filter((i) => i.tab);
  const tabItems = (flagged.length ? flagged : items).slice(0, 4);
  const active = activeHref(items, pathname);
  const moreActive = !!active && !tabItems.some((t) => t.href === active);

  useFocusTrap(mobileOpen, drawerRef, () => setMobileOpen(false));

  useEffect(() => {
    // Close the drawer on route change, deferred so it is not a synchronous setState in the effect body.
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function handleLogout() {
    setMobileOpen(false);
    setConfirmLogout(true);
  }

  async function doLogout() {
    setLoggingOut(true);
    try {
      await apiPost("/api/v1/auth/logout", {});
    } catch {
      // The session cookie may already be gone; leaving is still the right outcome.
    }
    // After signing out, go to the landing page rather than the login form.
    forgetCurrentUser();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="dc-app min-h-screen bg-dc-canvas lg:flex">
      <a href="#konten" className="dc-skip">
        Langsung ke konten
      </a>

      {/* Desktop sidebar */}
      {/* The sidebar column stretches with the page (no gap under it on long
          pages or in full-page captures); the menu inside sticks to the viewport. */}
      <aside className="hidden w-[272px] shrink-0 border-r border-dc-line bg-dc-sidebar lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-5 p-4">
        <div className="flex items-center justify-between pl-2 pt-1">
          <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex min-h-11 items-center rounded-md">
            <BrandLogo size={24} />
          </Link>
          <NotificationBell />
        </div>
        <div className="h-px bg-dc-line" aria-hidden />
        <nav aria-label="Menu utama" className="-mr-2 flex-1 overflow-y-auto pr-2 [scrollbar-width:thin]">
          <NavLinks navItems={items} active={active} layoutId="nav-desktop" />
        </nav>
        <UserCard user={user} eyebrow={eyebrow} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile top bar: the one translucent surface in the app. */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-dc-line bg-dc-sidebar/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex min-h-11 items-center rounded-md">
          <BrandLogo size={22} />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu dan akun"
            aria-expanded={mobileOpen}
            aria-controls="shell-drawer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-dc-gold/60 bg-dc-gold-wash font-heading text-base font-semibold text-dc-clay"
          >
            {initials(user)}
          </button>
        </div>
      </header>

      {/* Mobile drawer (full menu + account) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.button
              type="button"
              tabIndex={-1}
              aria-label="Tutup menu"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-dc-ink/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              ref={drawerRef}
              id="shell-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="absolute inset-y-0 right-0 flex w-[300px] max-w-[86vw] flex-col gap-4 border-l border-dc-line bg-dc-sidebar p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-float"
              initial={reduced ? { opacity: 0 } : { x: "100%" }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: reduced ? 0.01 : 0.38, ease: EASE }}
            >
              <div className="flex items-center justify-between pl-1">
                <BrandLogo size={22} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Tutup menu"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-dc-text-2 hover:bg-dc-cream hover:text-dc-ink"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <nav aria-label="Menu lengkap" className="flex-1 overflow-y-auto">
                <NavLinks navItems={items} active={active} onNavigate={() => setMobileOpen(false)} layoutId="nav-drawer" />
              </nav>
              <UserCard user={user} eyebrow={eyebrow} onLogout={handleLogout} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main id="konten" tabIndex={-1} className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] focus:outline-none lg:pb-0">
        {/* Shell remounts with each page: the sidebar and tab bar come back in
            the same place (the user is already known, see WithUser), and only
            the page content fades in, "route" preset. */}
        <div className="dc-page-enter">{children}</div>
      </main>

      {/* Mobile bottom tab bar: four destinations plus "Lainnya". 56px targets,
          the active tab carries a gold bar that slides between tabs. */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-dc-line bg-dc-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_color-mix(in_srgb,var(--dc-ink)_25%,transparent)] lg:hidden"
      >
        {tabItems.map((item) => {
          const on = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-offset-[-3px] ${
                on ? "text-dc-clay" : "text-dc-text-3"
              }`}
            >
              {on && (
                <motion.span
                  layoutId={reduced ? undefined : "tab-indicator"}
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute top-0 h-[3px] w-8 rounded-b-full bg-dc-gold"
                />
              )}
              <span className="relative">
                <NavIcon paths={item.icon} size={21} />
                {!!item.badgeCount && (
                  <span className="absolute -right-3 -top-1.5">
                    <Count n={item.badgeCount} />
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{item.short ?? item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-controls="shell-drawer"
          className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold focus-visible:outline-offset-[-3px] ${moreActive ? "text-dc-clay" : "text-dc-text-3"}`}
        >
          {moreActive && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-dc-gold" />}
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
          Lainnya
        </button>
      </nav>

      <Modal
        open={confirmLogout}
        onClose={() => !loggingOut && setConfirmLogout(false)}
        title="Keluar dari akun?"
        description="Kamu bisa masuk lagi kapan saja dengan email atau Google yang sama."
        size="sm"
      >
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmLogout(false)} disabled={loggingOut}>
            Batal
          </Button>
          <Button variant="primary" onClick={() => void doLogout()} loading={loggingOut}>
            Ya, keluar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
