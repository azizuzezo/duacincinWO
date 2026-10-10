"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NotificationBell } from "@/components/ui/NotificationBell";
import { apiPost, type CurrentUser } from "@/lib/api";

/** `short` is the label used in the mobile bottom tab bar, where 5 tabs leave ~70px each;
 * `tab` marks the (up to 4) destinations promoted to that bar, the rest live under "Lainnya". */
export type NavItem = { href: string; label: string; short?: string; tab?: boolean; match?: string[]; icon: readonly string[]; badgeCount?: number };

function initials(user: CurrentUser): string {
  const source = user.full_name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** A nav item is active on its own href, or on any `match` prefix (grouped pages like Etalase). */
function isActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) return true;
  return !!item.match?.some((m) => pathname.startsWith(m));
}

function NavIcon({ paths }: { paths: readonly string[] }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function NavLinks({ navItems, pathname, onNavigate, dark = false }: { navItems: NavItem[]; pathname: string | null; onNavigate?: () => void; dark?: boolean }) {
  return (
    <>
      {navItems.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
              dark
                ? active
                  ? "bg-dc-white/12 text-dc-white"
                  : "text-dc-white/75 hover:bg-dc-white/8 hover:text-dc-white"
                : active
                  ? "bg-dc-ink text-dc-white"
                  : "text-dc-ink/75 hover:bg-dc-cream hover:text-dc-ink"
            }`}
          >
            <NavIcon paths={item.icon} />
            <span className="flex-1">{item.label}</span>
            {!!item.badgeCount && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-dc-clay px-1.5 text-xs font-semibold text-dc-white">
                {item.badgeCount > 99 ? "99+" : item.badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

/** Shared authenticated-area shell: fixed left sidebar (drawer on mobile)
 * with role-aware nav + user card, consistent content container. */
export function Shell({
  user,
  navItems,
  loginPath,
  eyebrow,
  children,
}: {
  user: CurrentUser;
  navItems: NavItem[];
  loginPath: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const flagged = navItems.filter((i) => i.tab);
  const tabItems = (flagged.length ? flagged : navItems).slice(0, 4);

  useEffect(() => {
    // Close the mobile drawer on route change — deferred to a microtask so
    // this doesn't set state synchronously inside the effect body.
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

  // Escape closes the mobile drawer (keyboard accessibility, R-32).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  async function handleLogout() {
    await apiPost("/api/v1/auth/logout", {});
    router.replace(loginPath);
  }

  const brand = (
    <Link href="/" className="group flex items-center gap-2 px-1">
      <Image
        src="/brand/duacincin-logo.webp"
        alt="DuaCincin"
        width={28}
        height={28}
        className=""
      />
      <span className="font-heading text-2xl text-dc-ink">DuaCincin</span>
    </Link>
  );

  const userCard = (
    <div className="flex items-center gap-3 rounded-md border border-dc-ink/10 bg-dc-ivory p-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dc-ink text-xs font-semibold text-dc-white">
        {initials(user)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dc-ink">{user.full_name || user.email}</p>
        {eyebrow && <p className="text-xs text-dc-black/50">{eyebrow}</p>}
      </div>
      <button
        onClick={handleLogout}
        aria-label="Keluar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-dc-black/50 transition hover:bg-dc-black/5 hover:text-dc-ink"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </div>
  );

  const brandDark = (
    <Link href="/" className="group flex items-center gap-2 px-1">
      <Image
        src="/brand/duacincin-logo.webp"
        alt="DuaCincin"
        width={28}
        height={28}
        className=""
      />
      <span className="font-heading text-2xl text-dc-white">DuaCincin</span>
    </Link>
  );

  const userCardDark = (
    <div className="flex items-center gap-3 rounded-md border border-dc-white/15 bg-dc-white/5 p-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dc-white text-xs font-semibold text-dc-ink">
        {initials(user)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dc-white">{user.full_name || user.email}</p>
        {eyebrow && <p className="text-xs text-dc-white/70">{eyebrow}</p>}
      </div>
      <button
        onClick={handleLogout}
        aria-label="Keluar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-dc-white/70 transition hover:bg-dc-white/10 hover:text-dc-white"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-dc-ivory md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-dc-ink md:sticky md:top-0 md:flex md:h-screen md:flex-col md:gap-6 md:p-4">
        <div className="flex items-center justify-between">
          {brandDark}
          <NotificationBell light />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks navItems={navItems} pathname={pathname} dark />
        </nav>
        {userCardDark}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-dc-black/5 bg-dc-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        {brand}
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-dc-ink transition hover:bg-dc-ink/5"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-dc-black/40"
          />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col gap-6 bg-dc-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-dc-black/50 hover:bg-dc-black/5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              <NavLinks navItems={navItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </nav>
            {userCard}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar: the four most-used destinations plus a "Lainnya"
          entry that opens the full drawer. Thumb-reachable, 44px+ targets. */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-dc-ink/10 bg-dc-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabItems.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-dc-clay" : "text-dc-ink/70"
              }`}
            >
              <NavIcon paths={item.icon} />
              <span className="max-w-full truncate px-1">{item.short ?? item.label}</span>
              {!!item.badgeCount && (
                <span className="absolute right-[22%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-clay px-1 text-[10px] font-semibold text-dc-white">
                  {item.badgeCount > 99 ? "99+" : item.badgeCount}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-dc-ink/70"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />
          </svg>
          Lainnya
        </button>
      </nav>
    </div>
  );
}
