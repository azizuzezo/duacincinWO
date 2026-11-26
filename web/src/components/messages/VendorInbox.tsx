"use client";

// The vendor's inbox, in the same two-pane shape as the client one: the
// conversation list (with a search box and a Client / Tim filter) beside the
// open thread. Same data and rules as ConversationList, Putih styling.
import Link from "next/link";
import { useEffect, useState } from "react";

import { ConversationAvatar, describeConversation } from "@/components/ConversationList";
import { ClientArt } from "@/components/home/ClientArt";
import { ChatSessionButton, useChatSession } from "@/components/messages/ChatSession";
import { apiGet, type Conversation } from "@/lib/api";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink";
type Filter = "all" | "client" | "team";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "client", label: "Client" },
  { id: "team", label: "Tim DuaCincin" },
];

export function VendorInboxList({ userId, activeId, onLoaded }: { userId: string; activeId?: string; onLoaded?: (c: Conversation[]) => void }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  function load() {
    setState("loading");
    apiGet<Conversation[]>("/api/v1/conversations")
      .then((c) => {
        setItems(c ?? []);
        onLoaded?.(c ?? []);
        setState("ready");
      })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading")
    return (
      <div role="status" aria-label="Memuat percakapan" className="flex flex-col gap-1 p-2">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} aria-hidden className="flex items-center gap-3 px-2 py-3">
            <span className="block h-12 w-12 shrink-0 animate-pulse rounded-full bg-wd-blush" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="block h-3.5 w-2/3 animate-pulse rounded-full bg-wd-blush" />
              <span className="block h-3 w-1/3 animate-pulse rounded-full bg-wd-blush" />
            </span>
          </span>
        ))}
      </div>
    );
  if (state === "error")
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-4 text-sm text-wd-text">
        Percakapan belum bisa dimuat.
        <button type="button" onClick={load} className={`inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 ${FOCUS}`}>
          Coba lagi
        </button>
      </div>
    );
  if (items.length === 0)
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span aria-hidden className="block h-20 w-20">
          <ClientArt kind="bubble" />
        </span>
        <p className="mt-3 font-semibold text-wd-ink">Belum ada pesan</p>
        <p className="mt-1 text-sm text-wd-text">Chat dari client muncul di sini begitu mereka membuka etalasemu. Pesan dari tim DuaCincin juga masuk ke sini.</p>
      </div>
    );

  const q = query.trim().toLowerCase();
  const shown = items.filter((c) => {
    const d = describeConversation(c, userId);
    if (filter === "client" && c.type === "admin_vendor") return false;
    if (filter === "team" && c.type !== "admin_vendor") return false;
    return !q || d.name.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="px-2 pb-2">
        <label htmlFor="vendor-inbox-search" className="sr-only">
          Cari percakapan
        </label>
        <input
          id="vendor-inbox-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama client"
          autoComplete="off"
          className={`min-h-11 w-full rounded-full border border-wd-line-2 bg-white px-4 text-base text-wd-ink placeholder:text-wd-muted ${FOCUS}`}
        />
        <div role="group" aria-label="Saring percakapan" className="mt-2 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors ${FOCUS} ${filter === f.id ? "bg-wd-accent-soft text-wd-accent-ink" : "text-wd-text hover:bg-wd-paper"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p role="status" className="px-4 py-8 text-center text-sm text-wd-text">
          Tidak ada percakapan yang cocok.
        </p>
      ) : (
        <ul aria-label="Daftar percakapan" className="flex flex-col p-1.5">
          {shown.map((c) => {
            const d = describeConversation(c, userId);
            const active = c.id === activeId;
            return (
              <li key={c.id}>
                <Link
                  href={`/vendor/messages/${c.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[68px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${FOCUS} ${active ? "bg-wd-accent-wash" : "hover:bg-wd-paper"}`}
                >
                  <ConversationAvatar name={d.name} consult={d.consult} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-semibold text-wd-ink">{d.name}</span>
                    <span className="block truncate text-sm text-wd-text">{d.role}</span>
                  </span>
                  {c.closed_at && <span className="shrink-0 rounded-full bg-wd-paper px-2 py-0.5 text-[0.7rem] font-semibold text-wd-text ring-1 ring-wd-line">Ditutup</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Desktop pane: heading plus the list. Hidden on phones. */
export function VendorInboxPane({ userId, activeId, onLoaded }: { userId: string; activeId?: string; onLoaded?: (c: Conversation[]) => void }) {
  return (
    <aside aria-label="Semua percakapan" className="hidden min-h-0 flex-col md:flex">
      <div className="px-2 pb-3">
        <p className="wd-kicker">Pesan</p>
        <h2 className="wd-display text-[2rem] leading-tight">
          Kotak <em>masuk</em>
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <VendorInboxList userId={userId} activeId={activeId} onLoaded={onLoaded} />
      </div>
    </aside>
  );
}

/** Thread title bar: back (phones), who it is, a link to bookings, close session. */
export function VendorThreadHeader({ userId }: { userId: string }) {
  const session = useChatSession();
  const conv = session?.conversation;
  const d = conv ? describeConversation(conv, userId) : null;
  return (
    <div className="flex min-h-16 items-center gap-2 border-b border-wd-line bg-white px-2 pt-[env(safe-area-inset-top)] sm:px-4">
      <Link href="/vendor/messages" aria-label="Kembali ke semua pesan" className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wd-ink hover:bg-wd-accent-wash md:hidden ${FOCUS}`}>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      {d ? (
        <>
          <ConversationAvatar name={d.name} consult={d.consult} size="sm" />
          <div className="min-w-0 flex-1 py-2">
            <h1 className="wd-title truncate text-[1.1rem] leading-tight sm:text-[1.25rem]">{d.name}</h1>
            <p className="truncate text-xs text-wd-text">{d.role}</p>
          </div>
          {conv?.type === "vendor_chat" && (
            <Link href="/vendor/bookings" className={`inline-flex min-h-11 shrink-0 items-center rounded-full border border-wd-line-2 px-3.5 text-xs font-semibold text-wd-ink transition-colors hover:border-wd-ink sm:text-sm ${FOCUS}`}>
              Booking
            </Link>
          )}
          <ChatSessionButton />
        </>
      ) : (
        <div className="flex flex-1 items-center gap-3 py-2" aria-hidden>
          <span className="block h-10 w-10 animate-pulse rounded-full bg-wd-blush" />
          <span className="block h-4 w-40 animate-pulse rounded-full bg-wd-blush" />
        </div>
      )}
    </div>
  );
}
