"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ConversationAvatar, ConversationList, describeConversation } from "@/components/ConversationList";
import { ChatSessionButton } from "@/components/messages/ChatSession";
import { Rings } from "@/components/ui/Rings";
import type { Conversation } from "@/lib/api";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

/** Shortcut to the Wedding Consultant from the inbox. */
export function ConsultantShortcut({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/client/consultation"
      className={`group flex items-center gap-3 rounded-lg bg-dc-ink p-4 text-dc-on-dark transition-colors hover:bg-dc-ink-2 ${FOCUS} ${className}`}
    >
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dc-gold-antique/50 text-dc-gold-antique">
        <Rings className="h-4 w-7" stroke="currentColor" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Bingung memilih vendor?</span>
        <span className="block text-xs text-dc-on-dark/80">Ngobrol dengan Wedding Consultant</span>
      </span>
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-dc-gold-antique transition-transform duration-300 motion-safe:group-hover:translate-x-0.5">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
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
    <aside aria-label="Semua percakapan" className="hidden min-h-0 flex-col overflow-hidden rounded-xl border border-dc-line bg-dc-white shadow-soft md:flex">
      <div className="px-5 pb-2 pt-5">
        <p className="dc-eyebrow mb-1">Pesan</p>
        <h1 className="font-heading text-[2rem] leading-tight text-dc-ink">
          Kotak <span className="dc-em">masuk</span>
        </h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <ConversationList
          basePath="/client/messages"
          emptyLabel="Mulai dari halaman vendor atau chat Wedding Consultant."
          currentUserId={userId}
          activeId={activeId}
          onLoaded={onLoaded}
          bare
        />
      </div>
      <div className="border-t border-dc-line p-3">
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
    <div className="flex min-h-16 items-center gap-2 border-b border-dc-line bg-dc-white px-2 pt-[env(safe-area-inset-top)] sm:px-4">
      <Link
        href="/client/messages"
        aria-label="Kembali ke semua pesan"
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-ink hover:bg-dc-cream md:hidden ${FOCUS}`}
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      {d ? (
        <>
          <ConversationAvatar name={d.name} consult={d.consult} size="sm" />
          <div className="min-w-0 flex-1 py-2">
            <h1 className="truncate font-heading text-xl leading-tight text-dc-ink sm:text-2xl">{d.name}</h1>
            <p className="truncate text-xs text-dc-text-3">{d.role}</p>
          </div>
          {link && (
            <Link
              href={link.href}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border border-dc-line-strong px-3.5 text-xs font-semibold text-dc-ink transition-colors hover:border-dc-ink sm:text-sm ${FOCUS}`}
            >
              {link.label}
            </Link>
          )}
          <ChatSessionButton />
        </>
      ) : (
        <div className="flex flex-1 items-center gap-3 py-2" aria-hidden>
          <span className="dc-skeleton block h-10 w-10 rounded-full" />
          <span className="dc-skeleton block h-4 w-40 rounded-full" />
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
