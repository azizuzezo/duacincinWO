"use client";

// Marketplace-style chat popup for signed-in clients: a "Chat" pill at the
// bottom right that opens a panel (list of conversations, then the thread) so
// the couple can talk to a vendor without leaving the page they are on. The
// header chat icon and the vendor page's "Chat" button open it; the expand
// button goes to the full inbox. Desktop only: on phones chat stays a full
// page (a popup over a small screen is worse than a page). The thread is the
// same ChatThread as everywhere else, so receipts, attachments, replies and
// the contact-detail flags all work here too.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ChatThread } from "@/components/ChatThread";
import { ConversationAvatar, describeConversation } from "@/components/ConversationList";
import { ClientInboxList, ConsultantShortcut } from "@/components/messages/Inbox";
import { apiGet, type Conversation, type CurrentUser } from "@/lib/api";

const EVENT = "dc:chat";

/** Open the chat popup, optionally straight into one conversation. Returns false on screens too small for it. */
export function openChat(conversationId?: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia("(min-width: 768px)").matches) return false;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id: conversationId } }));
  return true;
}

const ICON = "flex h-9 w-9 items-center justify-center rounded-full text-wd-ink transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wd-ink";

export function ChatDock({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);

  const show = useCallback((id?: string) => {
    setOpen(true);
    setActiveId(id ?? null);
    setActive(null);
    if (id) apiGet<Conversation>(`/api/v1/conversations/${id}`).then(setActive).catch(() => {});
  }, []);

  useEffect(() => {
    const on = (e: Event) => show((e as CustomEvent<{ id?: string }>).detail?.id);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // The full inbox is already on screen: no second chat on top of it.
  if (user.role !== "client" || pathname?.startsWith("/client/messages")) return null;

  const d = active ? describeConversation(active, user.id) : null;

  return (
    <div className="hidden md:block">
      {!open && (
        <button
          type="button"
          onClick={() => show()}
          className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-wd-accent px-5 text-[0.95rem] font-bold text-wd-ink shadow-wd-pop transition-[background-color,transform] hover:bg-wd-accent-deep active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink"
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16v11H9l-5 4V5Z" />
          </svg>
          Chat
        </button>
      )}

      {open && (
        <section role="dialog" aria-label="Chat" className="fixed bottom-5 right-5 z-50 flex h-[min(620px,calc(100dvh-6rem))] w-[392px] flex-col overflow-hidden rounded-[22px] bg-white shadow-wd-pop ring-1 ring-wd-line">
          <header className="flex min-h-14 items-center gap-2 bg-wd-accent px-3">
            {activeId ? (
              <>
                <button type="button" onClick={() => { setActiveId(null); setActive(null); }} aria-label="Kembali ke daftar chat" className={ICON}>
                  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                {d && <ConversationAvatar name={d.name} consult={d.consult} size="sm" />}
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[0.98rem] font-bold text-wd-ink">{d?.name ?? "Memuat…"}</span>
                  {d && <span className="block truncate text-xs text-wd-ink/75">{d.role}</span>}
                </span>
              </>
            ) : (
              <span className="flex-1 pl-2 text-[1.05rem] font-bold text-wd-ink">Chat</span>
            )}
            <Link href={activeId ? `/client/messages/${activeId}` : "/client/messages"} aria-label="Buka halaman pesan penuh" className={ICON}>
              <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h6v6M20 4l-8 8M10 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
              </svg>
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup chat" className={ICON}>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div className="relative min-h-0 flex-1">
            {activeId ? (
              <ChatThread key={activeId} conversationId={activeId} currentUserId={user.id} variant="fill" notice={false} />
            ) : (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ClientInboxList userId={user.id} onSelect={(c) => { setActiveId(c.id); setActive(c); }} />
                </div>
                <div className="p-3 pt-1">
                  <ConsultantShortcut />
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
