"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ConversationAvatar, describeConversation } from "@/components/ConversationList";
import { ClientArt } from "@/components/home/ClientArt";
import { ChatSessionButton } from "@/components/messages/ChatSession";
import { apiGet, type Conversation } from "@/lib/api";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

/** Shortcut to the Wedding Consultant from the inbox. */
export function ConsultantShortcut({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/client/consultation"
      className={`group flex items-center gap-3 rounded-2xl bg-wd-accent-wash p-3 ring-1 ring-wd-line transition-colors hover:bg-[#f6ecd2] ${FOCUS} ${className}`}
    >
      <span aria-hidden className="block h-11 w-11 shrink-0 rounded-full bg-white p-1.5 ring-1 ring-wd-line">
        <ClientArt kind="bubble" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-wd-ink">Bingung memilih vendor?</span>
        <span className="block text-xs text-wd-text">Ngobrol dengan Wedding Consultant, gratis</span>
      </span>
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-wd-accent-ink transition-transform duration-300 motion-safe:group-hover:translate-x-0.5">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

/** The client's conversations as marketplace chat rows: avatar, who, their role.
 * Rows are links to the full page, or buttons when `onSelect` is given (the
 * chat dock). Same data and rules as the shared ConversationList. */
export function ClientInboxList({
  userId,
  activeId,
  onLoaded,
  onSelect,
}: {
  userId: string;
  activeId?: string;
  onLoaded?: (c: Conversation[]) => void;
  onSelect?: (c: Conversation) => void;
}) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

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
        <button type="button" onClick={load} className="font-semibold text-wd-accent-ink underline underline-offset-4">
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
        <p className="mt-3 font-semibold text-wd-ink">Belum ada percakapan</p>
        <p className="mt-1 text-sm text-wd-text">Mulai dari halaman vendor, lalu tekan Chat. Atau tanya Wedding Consultant.</p>
      </div>
    );

  return (
    <ul aria-label="Daftar percakapan" className="flex flex-col p-1.5">
      {items.map((c) => {
        const d = describeConversation(c, userId);
        const active = c.id === activeId;
        const row = (
          <>
            <ConversationAvatar name={d.name} consult={d.consult} />
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate font-semibold text-wd-ink">{d.name}</span>
              <span className="block truncate text-sm text-wd-text">{d.role}</span>
            </span>
            {c.closed_at && <span className="shrink-0 rounded-full bg-wd-paper px-2 py-0.5 text-[0.7rem] font-semibold text-wd-text ring-1 ring-wd-line">Ditutup</span>}
          </>
        );
        const cls = `flex min-h-[68px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${FOCUS} ${active ? "bg-wd-accent-wash" : "hover:bg-wd-paper"}`;
        return (
          <li key={c.id}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(c)} aria-current={active ? "true" : undefined} className={cls}>
                {row}
              </button>
            ) : (
              <Link href={`/client/messages/${c.id}`} aria-current={active ? "page" : undefined} className={cls}>
                {row}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Desktop inbox pane (list) next to the thread or placeholder. Hidden on mobile. */
export function InboxPane({
  userId,
  activeId,
  onLoaded,
}: {
  userId: string;
  activeId?: string;
  onLoaded?: (c: Conversation[]) => void;
}) {
  return (
    <aside aria-label="Semua percakapan" className="hidden min-h-0 flex-col md:flex">
      <div className="px-2 pb-3">
        <p className="wd-kicker">Pesan</p>
        <h1 className="wd-display text-[2rem] leading-tight">
          Kotak <em>masuk</em>
        </h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ClientInboxList userId={userId} activeId={activeId} onLoaded={onLoaded} />
      </div>
      <div className="pt-3">
        <ConsultantShortcut />
      </div>
    </aside>
  );
}

/** Thread title bar: back (mobile), who it is, and a link to their page. */
export function ThreadHeader({ conversation, userId }: { conversation?: Conversation; userId: string }) {
  const d = conversation ? describeConversation(conversation, userId) : null;
  const link =
    conversation?.type === "vendor_chat" && conversation.vendor_id
      ? { href: `/vendors/${conversation.vendor_id}`, label: "Profil vendor" }
      : conversation?.type === "consultation"
        ? { href: "/client/consultation", label: "Jadwalkan sesi" }
        : null;
  return (
    <div className="flex min-h-16 items-center gap-2 border-b border-wd-line bg-white px-2 pt-[env(safe-area-inset-top)] sm:px-4">
      <Link
        href="/client/messages"
        aria-label="Kembali ke semua pesan"
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wd-ink hover:bg-wd-accent-wash md:hidden ${FOCUS}`}
      >
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
          {link && (
            <Link href={link.href} className={`inline-flex min-h-10 shrink-0 items-center rounded-full border border-wd-line-2 px-3.5 text-xs font-semibold text-wd-ink transition-colors hover:border-wd-ink sm:text-sm ${FOCUS}`}>
              {link.label}
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

/**
 * Mobile: the thread covers the app chrome like a native messenger. While it
 * does, the hidden top bar and tab bar are made inert so keyboard focus never
 * lands behind the overlay. Desktop is unaffected.
 */
export function useMobileFullscreen() {
  const ref = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const main = ref.current?.closest("main");
    const parent = main?.parentElement;
    if (!mobile || !main || !parent) return;
    const others = Array.from(parent.children).filter((el): el is HTMLElement => el !== main && el instanceof HTMLElement);
    // Covered by the full-screen thread: out of tab order and out of the a11y tree.
    others.forEach((el) => {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
    });
    return () =>
      others.forEach((el) => {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      });
  }, [mobile]);

  return ref;
}
