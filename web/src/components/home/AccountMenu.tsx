"use client";

// Signed-in client's corner of the header, as on the big wedding marketplaces:
// quick icons (bookings, notifications, messages) and the avatar that opens a
// short account menu. The menu lists the client area (budget, planner,
// invitation, bookings...), so there is no separate panel or sidebar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { forgetCurrentUser } from "@/components/WithUser";
import { apiPost, type CurrentUser } from "@/lib/api";

function initials(user: CurrentUser): string {
  const source = user.full_name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase();
}

function Icon({ paths, size = 18 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const ICON_BTN = "relative flex h-10 w-10 items-center justify-center rounded-full text-wd-text transition-colors hover:bg-wd-accent-wash hover:text-wd-ink";

/** Menu entries: the client area from the nav config, minus the public "Cari Vendor" (it is in the header). */
export const ACCOUNT_LINKS = CLIENT_NAV.filter((i) => i.href !== "/vendors");

export function useLogout() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function doLogout() {
    setBusy(true);
    try {
      await apiPost("/api/v1/auth/logout", {});
    } catch {
      // The session may already be gone; leaving is still the right outcome.
    }
    forgetCurrentUser();
    router.replace("/");
    router.refresh();
  }
  const modal = (
    <Modal open={confirm} onClose={() => !busy && setConfirm(false)} title="Keluar dari akun?" description="Kamu bisa masuk lagi kapan saja dengan email atau Google yang sama." size="sm">
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>
          Batal
        </Button>
        <Button variant="primary" onClick={() => void doLogout()} loading={busy}>
          Ya, keluar
        </Button>
      </div>
    </Modal>
  );
  return { ask: () => setConfirm(true), modal };
}

export function AccountMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const logout = useLogout();
  const first = user.full_name?.trim().split(/\s+/)[0] || "Akun";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const bookings = CLIENT_NAV.find((i) => i.href === "/client/bookings");
  const messages = CLIENT_NAV.find((i) => i.href === "/client/messages");

  return (
    <div className="flex items-center gap-0.5">
      {bookings && (
        <Link href={bookings.href} aria-label="Booking saya" className={`${ICON_BTN} hidden sm:flex`}>
          <Icon paths={bookings.icon} size={20} />
        </Link>
      )}
      <div className="wd-bell">
        <NotificationBell />
      </div>
      {messages && (
        <Link href={messages.href} aria-label="Pesan" className={`${ICON_BTN} hidden sm:flex`}>
          <Icon paths={messages.icon} size={20} />
        </Link>
      )}
      <span aria-hidden className="mx-2 hidden h-6 w-px bg-wd-line sm:block" />
      <div ref={ref} className="relative">
        <button
          ref={btn}
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="menu-akun"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-wd-accent-wash"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wd-accent text-[0.8rem] font-bold text-wd-ink">{initials(user)}</span>
          <span className="hidden max-w-[110px] truncate text-[0.92rem] font-semibold text-wd-ink md:block">{first}</span>
          <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`hidden text-wd-muted transition-transform md:block ${open ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div id="menu-akun" role="menu" className="absolute right-0 top-full z-50 mt-2 w-[270px] rounded-2xl bg-white p-2 shadow-wd-pop ring-1 ring-wd-line">
            <div className="flex items-center gap-3 border-b border-wd-line px-3 pb-3 pt-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wd-accent text-sm font-bold text-wd-ink">{initials(user)}</span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-semibold text-wd-ink">{user.full_name || "Akunmu"}</span>
                <span className="block truncate text-[0.8rem] text-wd-muted">{user.email}</span>
              </span>
            </div>
            <ul className="py-1">
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.href} role="none">
                  <Link role="menuitem" href={l.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.93rem] text-wd-ink transition-colors hover:bg-wd-accent-wash">
                    <span className="text-wd-accent-ink">
                      <Icon paths={l.icon} />
                    </span>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-wd-line pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  logout.ask();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.93rem] text-wd-ink transition-colors hover:bg-wd-accent-wash"
              >
                <span className="text-wd-accent-ink">
                  <Icon paths={["M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3", "M10 17l5-5-5-5", "M15 12H4"]} />
                </span>
                Keluar
              </button>
            </div>
          </div>
        )}
      </div>
      {logout.modal}
    </div>
  );
}
