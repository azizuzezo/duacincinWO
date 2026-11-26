"use client";

// The staff frame (admin and wedding consultant), in the same marketplace
// spirit as the client and vendor areas: a white header with the account
// corner and one row of sections. The admin menu has 15 destinations, so they
// sit in five named groups (Verifikasi, Uang dan sengketa, ...) that open as
// small menus; each group and item carries a live count of open work. Phones
// get a bottom tab bar plus a full menu sheet.
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccountMenu } from "@/components/home/AccountMenu";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import type { CurrentUser } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";
import { useAdminQueues, type AdminQueues } from "@/lib/useAdminQueues";

import type { NavItem } from "./Shell";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink";

const QUEUE_BY_HREF: Record<string, keyof AdminQueues> = {
  "/internal/admin/disputes": "disputes",
  "/internal/admin/disbursements": "disbursements",
  "/internal/admin/vendors": "vendors",
  "/internal/admin/vendor-name-changes": "nameChanges",
};

function NavIcon({ paths, size = 18 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Open-work count: a gold pill that changes the moment the number does. */
function Count({ n }: { n: number }) {
  return (
    <span aria-label={`${n} menunggu`} className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wd-accent px-1.5 text-[11px] font-bold tabular-nums text-wd-ink">
      {n > 99 ? "99+" : n}
    </span>
  );
}

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

type Entry = { kind: "link"; item: NavItem } | { kind: "group"; name: string; items: NavItem[] };

/** Ungrouped items stay links; items sharing a `group` name become one menu (first appearance sets the order). */
function toEntries(items: NavItem[]): Entry[] {
  const out: Entry[] = [];
  for (const item of items) {
    if (!item.group) {
      out.push({ kind: "link", item });
      continue;
    }
    const existing = out.find((e): e is Extract<Entry, { kind: "group" }> => e.kind === "group" && e.name === item.group);
    if (existing) existing.items.push(item);
    else out.push({ kind: "group", name: item.group, items: [item] });
  }
  return out;
}

export function AdminShell({ user, navItems, eyebrow, children }: { user: CurrentUser; navItems: NavItem[]; loginPath?: string; eyebrow?: string; tone?: "wd"; children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { queues } = useAdminQueues(user.role === "admin");
  const items = navItems.map((i) => {
    const key = QUEUE_BY_HREF[i.href];
    return key && queues && queues[key] > 0 ? { ...i, badgeCount: queues[key] } : i;
  });
  const entries = toEntries(items);
  const active = activeHref(items, pathname);
  const tabs = items.filter((i) => i.tab).slice(0, 4);
  const tabBar = tabs.length ? tabs : items.slice(0, 4);
  const moreActive = !!active && !tabBar.some((t) => t.href === active);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const barRef = useRef<HTMLUListElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheet, sheetRef, () => setSheet(false));

  useEffect(() => {
    queueMicrotask(() => {
      setOpenGroup(null);
      setSheet(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: PointerEvent) => !barRef.current?.contains(e.target as Node) && setOpenGroup(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenGroup(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup]);

  const single = entries.length <= 1;

  return (
    <div data-wd-public className="wd dc-app flex min-h-svh flex-col bg-white">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-wd-ink focus:px-4 focus:py-2 focus:text-white">
        Langsung ke konten
      </a>
      <header className="sticky top-0 z-50 border-b border-wd-line bg-white">
        <div className="wd-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={items[0]?.href ?? "/"} aria-label="DuaCincin, beranda staf" className={`inline-flex min-h-11 items-center rounded-md ${FOCUS}`}>
              <BrandLogo size={26} />
            </Link>
            <span className="hidden rounded-full bg-wd-accent-soft px-3 py-1 text-[0.78rem] font-semibold text-wd-accent-ink sm:inline-block">{eyebrow === "Admin" ? "Pusat admin" : "Pusat konsultan"}</span>
          </div>
          <AccountMenu user={user} />
        </div>
        {!single && (
          <nav aria-label="Menu staf" className="wd-container hidden md:block">
            <ul ref={barRef} className="-mb-px flex gap-1">
              {entries.map((e) => {
                if (e.kind === "link") {
                  const on = e.item.href === active;
                  return (
                    <li key={e.item.href} className="relative shrink-0">
                      <Link href={e.item.href} aria-current={on ? "page" : undefined} className={`relative inline-flex min-h-12 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${FOCUS}`}>
                        <span className={on ? "text-wd-accent-ink" : "text-wd-muted"}>
                          <NavIcon paths={e.item.icon} />
                        </span>
                        {e.item.label}
                        {!!e.item.badgeCount && <Count n={e.item.badgeCount} />}
                        {on && <motion.span layoutId={reduced ? undefined : "admin-underline"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
                      </Link>
                    </li>
                  );
                }
                const on = e.items.some((i) => i.href === active);
                const open = openGroup === e.name;
                const total = e.items.reduce((n, i) => n + (i.badgeCount ?? 0), 0);
                return (
                  <li key={e.name} className="relative shrink-0">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={open}
                      onClick={() => setOpenGroup(open ? null : e.name)}
                      className={`relative inline-flex min-h-12 items-center gap-2 px-3.5 text-[0.93rem] transition-colors ${on || open ? "font-semibold text-wd-ink" : "text-wd-text hover:text-wd-ink"} ${FOCUS}`}
                    >
                      {e.name}
                      {total > 0 && <Count n={total} />}
                      <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`text-wd-muted transition-transform ${open ? "rotate-180" : ""}`}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                      {on && <motion.span layoutId={reduced ? undefined : "admin-underline"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-wd-accent-deep" />}
                    </button>
                    {open && (
                      <div role="menu" className="absolute left-0 top-full z-50 mt-1 w-[250px] rounded-[18px] bg-white p-1.5 shadow-wd-pop ring-1 ring-wd-line">
                        {e.items.map((i) => (
                          <Link key={i.href} role="menuitem" href={i.href} aria-current={i.href === active ? "page" : undefined} className={`flex min-h-11 items-center gap-2.5 rounded-[12px] px-3 text-[0.9rem] transition-colors hover:bg-wd-accent-wash ${i.href === active ? "bg-wd-accent-wash font-semibold text-wd-ink" : "text-wd-ink"} ${FOCUS}`}>
                            <span className="text-wd-accent-ink">
                              <NavIcon paths={i.icon} size={17} />
                            </span>
                            <span className="flex-1">{i.label}</span>
                            {!!i.badgeCount && <Count n={i.badgeCount} />}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      <main id="konten" tabIndex={-1} className={`min-w-0 flex-1 bg-white focus:outline-none ${single ? "" : "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"}`}>
        <div className="dc-page-enter">{children}</div>
      </main>

      {!single && (
        <>
          <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-wd-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
            {tabBar.map((item) => {
              const on = item.href === active;
              return (
                <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-wd-accent-ink" : "text-wd-muted"} ${FOCUS}`}>
                  {on && <motion.span layoutId={reduced ? undefined : "admin-tab"} transition={SPRING_SNAPPY} aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-wd-accent-deep" />}
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
            <button type="button" onClick={() => setSheet(true)} aria-expanded={sheet} aria-controls="admin-more" className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${moreActive ? "text-wd-accent-ink" : "text-wd-muted"} ${FOCUS}`}>
              {moreActive && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-wd-accent-deep" />}
              <svg aria-hidden width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
              Lainnya
            </button>
          </nav>

          <AnimatePresence>
            {sheet && (
              <div className="fixed inset-0 z-[60] md:hidden">
                <motion.button type="button" tabIndex={-1} aria-label="Tutup menu" onClick={() => setSheet(false)} className="absolute inset-0 bg-wd-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.div
                  ref={sheetRef}
                  id="admin-more"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Menu lengkap"
                  className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[24px] bg-white p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
                  initial={reduced ? { opacity: 0 } : { y: "100%" }}
                  animate={reduced ? { opacity: 1 } : { y: 0 }}
                  exit={reduced ? { opacity: 0 } : { y: "100%" }}
                  transition={{ duration: reduced ? 0.01 : 0.34, ease: EASE }}
                >
                  {entries.map((e) => {
                    const list = e.kind === "link" ? [e.item] : e.items;
                    return (
                      <div key={e.kind === "link" ? e.item.href : e.name}>
                        {e.kind === "group" && <p className="px-3 pb-1 pt-4 text-xs font-semibold text-wd-muted">{e.name}</p>}
                        <ul>
                          {list.map((i) => (
                            <li key={i.href}>
                              <Link href={i.href} onClick={() => setSheet(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.98rem] font-semibold text-wd-ink hover:bg-wd-accent-wash ${FOCUS}`}>
                                <span className="text-wd-accent-ink">
                                  <NavIcon paths={i.icon} size={20} />
                                </span>
                                <span className="flex-1">{i.label}</span>
                                {!!i.badgeCount && <Count n={i.badgeCount} />}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
