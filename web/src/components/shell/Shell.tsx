"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NotificationBell } from "@/components/ui/NotificationBell";
import { apiPost, type CurrentUser } from "@/lib/api";

export type NavItem = { href: string; label: string; icon: readonly string[]; badgeCount?: number };

function initials(user: CurrentUser): string {
  const source = user.full_name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
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

function NavLinks({ navItems, pathname, onNavigate }: { navItems: NavItem[]; pathname: string | null; onNavigate?: () => void }) {
  return (
    <>
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active ? "bg-dc-navy text-dc-white shadow-sm shadow-dc-navy/30" : "text-dc-navy/70 hover:bg-dc-navy/5 hover:text-dc-navy"
            }`}
          >
            <NavIcon paths={item.icon} />
            <span className="flex-1">{item.label}</span>
            {!!item.badgeCount && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-dc-rose px-1.5 text-xs font-semibold text-dc-white">
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

  useEffect(() => {
    // Close the mobile drawer on route change — deferred to a microtask so
    // this doesn't set state synchronously inside the effect body.
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

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
        className="transition-transform duration-300 group-hover:rotate-12"
      />
      <span className="font-heading text-base font-extrabold text-dc-navy">DuaCincin</span>
    </Link>
  );

  const userCard = (
    <div className="flex items-center gap-3 rounded-xl border border-dc-black/5 bg-dc-offwhite p-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dc-navy text-xs font-bold text-dc-gold">
        {initials(user)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dc-navy">{user.full_name || user.email}</p>
        {eyebrow && <p className="text-xs text-dc-black/50">{eyebrow}</p>}
      </div>
      <button
        onClick={handleLogout}
        aria-label="Keluar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-dc-black/50 transition hover:bg-dc-black/5 hover:text-dc-navy"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-dc-offwhite md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-dc-black/5 bg-dc-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:gap-6 md:p-4">
        <div className="flex items-center justify-between">
          {brand}
          <NotificationBell />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks navItems={navItems} pathname={pathname} />
        </nav>
        {userCard}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-dc-black/5 bg-dc-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        {brand}
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-dc-navy transition hover:bg-dc-navy/5"
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

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
