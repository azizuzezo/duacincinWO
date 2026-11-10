"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiGet, apiPost, type AppNotification } from "@/lib/api";

const POLL_MS = 30000;

export function NotificationBell({ light = false }: { light?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function poll() {
      apiGet<{ unread: number }>("/api/v1/notifications/unread-count")
        .then((d) => setUnread(d.unread))
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleToggle() {
    setOpen((v) => !v);
    if (!loaded) {
      apiGet<AppNotification[]>("/api/v1/notifications")
        .then((d) => setItems(d ?? []))
        .catch(() => {})
        .finally(() => setLoaded(true));
    }
  }

  async function handleMarkAllRead() {
    await apiPost("/api/v1/notifications/read-all", {});
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function handleItemClick(n: AppNotification) {
    if (!n.read) {
      await apiPost(`/api/v1/notifications/${n.id}/read`, {});
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifikasi"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${light ? "text-dc-on-dark/85 hover:bg-dc-on-dark/10 hover:text-dc-on-dark" : "text-dc-ink hover:bg-dc-cream"}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-dc-gold-antique px-1 text-[10px] font-bold text-dc-ink">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifikasi" className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-dc-line bg-dc-white text-left shadow-float">
          <div className="flex items-center justify-between border-b border-dc-line px-4 py-3">
            <p className="font-heading text-xl font-semibold text-dc-ink">Notifikasi</p>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="inline-flex min-h-11 items-center px-1 text-xs font-semibold text-dc-clay underline-offset-4 hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <p role="status" className="p-4 text-center text-sm text-dc-text-3">Memuat notifikasi</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-dc-text-3">Belum ada notifikasi. Kabar booking dan pesan baru akan muncul di sini.</p>
            ) : (
              items.map((n) => {
                const content = (
                  <div className={`relative px-4 py-3 ${n.read ? "" : "bg-dc-gold/[0.07] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:rounded-full before:bg-dc-gold"}`}>
                    <p className="text-sm font-semibold text-dc-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs leading-relaxed text-dc-text-2">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-dc-text-3">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => handleItemClick(n)} className="block border-b border-dc-line last:border-0 hover:bg-dc-cream">
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => handleItemClick(n)} className="block w-full border-b border-dc-line text-left last:border-0 hover:bg-dc-cream">
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
