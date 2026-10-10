"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiGet, apiPost, type AppNotification } from "@/lib/api";

const POLL_MS = 30000;

export function NotificationBell() {
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
        onClick={handleToggle}
        aria-label="Notifikasi"
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-dc-ink transition hover:bg-dc-ink/5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-clay px-1 text-[10px] font-semibold text-dc-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border border-dc-ink/10 bg-dc-white shadow-xl">
          <div className="flex items-center justify-between border-b border-dc-black/5 px-4 py-3">
            <p className="font-heading font-bold text-dc-ink">Notifikasi</p>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-semibold text-dc-gold hover:text-dc-ink">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <p className="p-4 text-center text-sm text-dc-black/50">Memuat…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-center text-sm text-dc-black/50">Belum ada notifikasi.</p>
            ) : (
              items.map((n) => {
                const content = (
                  <div className={`px-4 py-3 ${n.read ? "" : "bg-dc-clay/5"}`}>
                    <p className="text-sm font-semibold text-dc-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-dc-black/60">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-dc-black/40">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => handleItemClick(n)} className="block border-b border-dc-black/5 last:border-0 hover:bg-dc-cream">
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => handleItemClick(n)} className="block w-full border-b border-dc-black/5 text-left last:border-0 hover:bg-dc-cream">
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
