"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { chatDayLabel, formatJam, sameDay } from "@/components/booking/format";
import { describeConversation } from "@/components/ConversationList";
import { ChatSessionContext, ClosedMarker, ClosedNotice, MessageTicks } from "@/components/messages/ChatSession";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  apiGet,
  apiPost,
  apiPostForm,
  apiWsUrl,
  ApiError,
  type ChatMessage,
  type Conversation,
  type ConversationReadEvent,
  type ConversationUpdatedEvent,
  type MessageStatus,
  type NewMessageEvent,
  type ReceiptsEvent,
} from "@/lib/api";
import { useReducedMotion } from "@/lib/motion";

type IncomingEvent = NewMessageEvent | ConversationReadEvent | ReceiptsEvent | ConversationUpdatedEvent;

/** Without a live connection (e.g. serverless hosting) the thread polls:
 * every 4s while visible, every 16s in a background tab (enough to report
 * "Diterima" without waking the device for nothing). */
const POLL_MS = 4000;
const HIDDEN_POLL_EVERY = 4;

const STATUS_RANK: Record<MessageStatus, number> = { sent: 0, delivered: 1, read: 2 };

/** Ticks only move forward: a late poll never turns blue back to grey. */
function laterStatus(a: MessageStatus | undefined, b: MessageStatus | undefined): MessageStatus {
  const x = a ?? "sent";
  const y = b ?? "sent";
  return STATUS_RANK[x] >= STATUS_RANK[y] ? x : y;
}

/** Server list is the truth; keep local messages the fetch could not have
 * seen yet (sent while it was in flight) and never downgrade a tick. */
function mergeMessages(server: ChatMessage[], prev: ChatMessage[]): ChatMessage[] {
  const prevById = new Map(prev.map((m) => [m.id, m]));
  const merged = server.map((m) => {
    const old = prevById.get(m.id);
    return old ? { ...m, status: laterStatus(m.status, old.status) } : m;
  });
  const lastServer = server[server.length - 1]?.created_at ?? "";
  const serverIds = new Set(server.map((m) => m.id));
  const pending = prev.filter((m) => !serverIds.has(m.id) && m.created_at > lastServer);
  return pending.length ? [...merged, ...pending] : merged;
}

function isVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";
const ICON_BTN = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-2 transition-colors hover:bg-dc-cream hover:text-dc-ink disabled:opacity-50 ${FOCUS}`;

/** True notice about what the chat does (server flags contact details for
 * review; it does not hide them), shown once at the top of every thread. */
const DEFAULT_NOTICE =
  "Simpan kesepakatan dan pembayaran di DuaCincin supaya danamu tetap dilindungi escrow. Pesan berisi nomor telepon, email, atau tautan luar akan ditandai untuk ditinjau tim DuaCincin.";

/**
 * One conversation as a messenger: day separators, grouped bubbles (mine in
 * ink on the right, theirs on warm white), reply quotes, image attachments,
 * WhatsApp-style ticks on your own bubbles, contact-detail flags, and a
 * composer that stays at the bottom (or a calm notice while the session is
 * closed). Live updates come over a websocket; without one the thread polls.
 * Headers rendered through `header` can place <ChatSessionButton /> (it reads
 * this thread's session through context).
 * - `variant="card"` (default): a bordered card sized to the viewport.
 * - `variant="fill"`: fills its parent (e.g. a full-screen mobile thread).
 * - `header`: rendered above the messages (name, back button).
 * - `notice`: override the safety notice, or `false` to hide it.
 */
export function ChatThread({
  conversationId,
  currentUserId,
  variant = "card",
  header,
  notice,
}: {
  conversationId: string;
  currentUserId: string;
  variant?: "card" | "fill";
  header?: React.ReactNode;
  notice?: React.ReactNode | false;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [visible, setVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastMarkedRef = useRef<string | null>(null);
  const lastScrolledRef = useRef<string | null>(null);
  const focusComposerRef = useRef(false);
  // Messages present at first load render still; later arrivals get a short entrance.
  const [initialIds, setInitialIds] = useState<Set<string> | null>(null);
  const reduced = useReducedMotion();
  const { show } = useToast();

  const loadConversation = useCallback(async () => {
    try {
      const conv = await apiGet<Conversation>(`/api/v1/conversations/${conversationId}`);
      setConversation(conv);
    } catch {
      // Names and session state are extras; the messages still load.
    }
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;
    let wsOpen = false;
    let tick = 0;

    async function load(initial: boolean) {
      try {
        // Fetching the thread is also what tells the other side "Diterima".
        const [msgs, conv] = await Promise.all([
          apiGet<ChatMessage[]>(`/api/v1/conversations/${conversationId}/messages`),
          apiGet<Conversation>(`/api/v1/conversations/${conversationId}`).catch(() => null),
        ]);
        if (cancelled) return;
        setInitialIds((prev) => prev ?? new Set((msgs ?? []).map((m) => m.id)));
        setMessages((prev) => mergeMessages(msgs ?? [], prev));
        if (conv) setConversation(conv);
        setError((e) => (initial ? null : e));
      } catch (err) {
        if (!cancelled && initial) setError(err instanceof ApiError ? err.message : "Gagal memuat percakapan.");
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    }
    load(true);

    const ws = new WebSocket(apiWsUrl(`/api/v1/conversations/${conversationId}/ws`));
    ws.onopen = () => {
      wsOpen = true;
    };
    ws.onmessage = (evt) => {
      let data: IncomingEvent;
      try {
        data = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (data.type === "message.new") {
        const msg = data.message;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        // Arrived while the tab is in the background: reached the app, not seen yet.
        if (msg.sender_id !== currentUserId && !isVisible()) {
          apiPost(`/api/v1/conversations/${conversationId}/delivered`, {}).catch(() => {});
        }
      } else if (data.type === "receipts.updated") {
        const ids = new Set(data.message_ids);
        const status = data.status;
        setMessages((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, status: laterStatus(m.status, status) } : m)));
      } else if (data.type === "conversation.updated") {
        setConversation(data.conversation);
      }
    };
    const dropToPolling = () => {
      wsOpen = false;
    };
    ws.onerror = dropToPolling;
    ws.onclose = dropToPolling;

    // Poll whenever there is no live connection (always the case on serverless hosting).
    const timer = window.setInterval(() => {
      if (wsOpen) return;
      tick += 1;
      if (!isVisible() && tick % HIDDEN_POLL_EVERY !== 0) return;
      load(false);
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      ws.onclose = null;
      ws.close();
    };
  }, [conversationId, currentUserId]);

  // "Dibaca" only counts while the thread is actually on screen.
  useEffect(() => {
    const update = () => setVisible(isVisible());
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // Follow the conversation down only when a new message lands, so a poll
  // refreshing ticks never yanks someone who is reading older messages.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastScrolledRef.current) return;
    const first = lastScrolledRef.current === null;
    lastScrolledRef.current = last.id;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduced || first ? "auto" : "smooth" });
  }, [messages, reduced]);

  // Opening the thread with their messages visible turns the sender's ticks blue.
  useEffect(() => {
    if (!visible) return;
    const last = messages[messages.length - 1];
    if (!last || last.id === lastMarkedRef.current) return;
    const unread = messages.some((m) => m.sender_id !== currentUserId && m.status !== "read");
    if (!unread) return;
    lastMarkedRef.current = last.id;
    apiPost(`/api/v1/conversations/${conversationId}/read`, { last_read_message_id: last.id }).catch(() => {
      lastMarkedRef.current = null;
    });
  }, [messages, conversationId, currentUserId, visible]);

  const closed = !!conversation?.closed_at;

  // Closing adds the "Sesi ditutup" marker at the end of the history: bring it into view.
  // Reopening hands focus back to the composer that just reappeared.
  useEffect(() => {
    if (closed) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    else if (focusComposerRef.current) {
      focusComposerRef.current = false;
      textRef.current?.focus();
    }
  }, [closed, reduced]);

  const otherName = conversation ? describeConversation(conversation, currentUserId).name : "Lawan bicaramu";

  async function setSession(action: "close" | "reopen") {
    setSessionBusy(true);
    try {
      const conv = await apiPost<Conversation>(`/api/v1/conversations/${conversationId}/${action}`, {});
      setConversation(conv);
      setConfirmClose(false);
      setError(null);
      if (action === "close") {
        setReplyingTo(null);
        show("Sesi chat ditutup.", "success");
      } else {
        show("Sesi chat dibuka kembali.", "success");
        focusComposerRef.current = true;
      }
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Belum berhasil. Coba lagi sebentar.", "danger");
    } finally {
      setSessionBusy(false);
    }
  }

  /** A send refused because the other side just closed the session. */
  function handleSendError(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.status === 409) loadConversation();
    setError(err instanceof ApiError ? err.message : fallback);
  }

  const sessionValue = useMemo(() => ({ conversation, currentUserId, busy: sessionBusy, requestClose: () => setConfirmClose(true) }), [conversation, currentUserId, sessionBusy]);

  // Composer grows with the text up to ~5 lines.
  useLayoutEffect(() => {
    const t = textRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 132)}px`;
  }, [body]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await apiPost<ChatMessage>(`/api/v1/conversations/${conversationId}/messages`, {
        body,
        reply_to_message_id: replyingTo?.id,
      });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setBody("");
      setReplyingTo(null);
    } catch (err) {
      handleSendError(err, "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  async function handleAttachmentSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploaded = await apiPostForm<{ url: string; type: string }>(`/api/v1/conversations/${conversationId}/attachments`, form);
      const msg = await apiPost<ChatMessage>(`/api/v1/conversations/${conversationId}/messages`, {
        body,
        attachment_url: uploaded.url,
        attachment_type: uploaded.type,
        reply_to_message_id: replyingTo?.id,
      });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setBody("");
      setReplyingTo(null);
    } catch (err) {
      handleSendError(err, "Gagal mengunggah lampiran.");
    } finally {
      setSending(false);
    }
  }

  function startReply(m: ChatMessage) {
    setReplyingTo(m);
    textRef.current?.focus();
  }

  const shell =
    variant === "fill"
      ? "flex h-full min-h-0 flex-col bg-dc-ivory"
      : "flex h-[calc(100dvh-14rem)] min-h-96 flex-col overflow-hidden rounded-xl border border-dc-line bg-dc-ivory shadow-soft";
  const noticeNode = notice === false ? null : (notice ?? DEFAULT_NOTICE);

  return (
    <ChatSessionContext.Provider value={sessionValue}>
      <div className={shell}>
        {header}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Isi percakapan"
          aria-busy={loading || undefined}
        >
          {noticeNode && (
            <div className="mx-auto mb-5 flex max-w-md items-start gap-2.5 rounded-lg border border-dc-gold/35 bg-dc-white px-4 py-3 text-xs leading-relaxed text-dc-text-2">
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-px shrink-0 text-dc-clay"
              >
                <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3Z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <p>{noticeNode}</p>
            </div>
          )}

          {loading ? (
            <div aria-hidden className="flex flex-col gap-3">
              <Skeleton className="h-11 w-2/3 self-start rounded-2xl" />
              <Skeleton className="h-11 w-1/2 self-end rounded-2xl" />
              <Skeleton className="h-16 w-3/5 self-start rounded-2xl" />
            </div>
          ) : messages.length === 0 && !error ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <p className="font-heading text-2xl text-dc-ink">Belum ada pesan</p>
              <p className="mt-1 max-w-xs text-sm text-dc-text-2">Sapa dulu, lalu ceritakan tanggal, lokasi, dan kebutuhanmu.</p>
            </div>
          ) : (
            <ol className="flex flex-col">
              {messages.map((m, i) => {
                const mine = m.sender_id === currentUserId;
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const newDay = !prev || !sameDay(prev.created_at, m.created_at);
                const groupedWithPrev = !newDay && prev?.sender_id === m.sender_id;
                const groupedWithNext = !!next && next.sender_id === m.sender_id && sameDay(next.created_at, m.created_at);
                const fresh = initialIds !== null && !initialIds.has(m.id);
                const isImage = !!m.attachment_url && !!m.attachment_type?.startsWith("image/");
                const corner = mine
                  ? `${groupedWithPrev ? "rounded-tr-md" : ""} ${groupedWithNext ? "rounded-br-md" : ""}`
                  : `${groupedWithPrev ? "rounded-tl-md" : ""} ${groupedWithNext ? "rounded-bl-md" : ""}`;
                return (
                  <li key={m.id} className={groupedWithPrev ? "mt-1" : "mt-3"}>
                    {newDay && (
                      <p className="my-3 flex justify-center">
                        <span className="rounded-full bg-dc-cream px-3 py-1 text-xs font-semibold text-dc-text-2">{chatDayLabel(m.created_at)}</span>
                      </p>
                    )}
                    <div className={`group flex flex-col ${mine ? "items-end" : "items-start"} ${fresh && !reduced ? "animate-fade-up" : ""}`}>
                      <div className={`flex max-w-[86%] items-center gap-1 sm:max-w-[72%] ${mine ? "flex-row-reverse" : ""}`}>
                        <div
                          className={`min-w-0 rounded-2xl px-3.5 py-2 text-[0.95rem] leading-relaxed ${corner} ${
                            mine ? "bg-dc-ink text-dc-on-dark" : "border border-dc-line bg-dc-white text-dc-black"
                          }`}
                        >
                          <span className="sr-only">{mine ? "Kamu: " : "Mereka: "}</span>
                          {m.reply_to && (
                            <div className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-xs ${mine ? "bg-dc-ink-3 text-dc-on-dark/85" : "bg-dc-cream text-dc-text-2"}`}>
                              <span className={`block font-semibold ${mine ? "text-dc-gold-antique" : "text-dc-clay"}`}>
                                {m.reply_to.sender_id === currentUserId ? "Kamu" : "Mereka"}
                              </span>
                              <span className="line-clamp-2 wrap-break-word">{m.reply_to.body || "Lampiran"}</span>
                            </div>
                          )}
                          {m.attachment_url && isImage && (
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`-mx-1.5 mb-1.5 block overflow-hidden rounded-xl ${FOCUS}`}
                              aria-label="Buka gambar lampiran ukuran penuh"
                            >
                              <Image src={m.attachment_url} alt="Lampiran gambar" width={240} height={240} unoptimized className="max-h-60 w-auto max-w-full object-cover" />
                            </a>
                          )}
                          {m.attachment_url && !isImage && (
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`mb-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 ${mine ? "text-dc-gold-antique" : "text-dc-clay"} ${FOCUS}`}
                            >
                              Buka lampiran
                            </a>
                          )}
                          {m.body && <span className="whitespace-pre-wrap wrap-break-word">{m.body}</span>}
                          <span className={`ml-2 inline-flex translate-y-0.5 items-center gap-1 text-xs tabular-nums ${mine ? "text-dc-on-dark/70" : "text-dc-text-3"}`}>
                            {formatJam(m.created_at)}
                            {mine && <MessageTicks status={m.status} />}
                          </span>
                        </div>
                        {!closed && (
                          <button
                            type="button"
                            onClick={() => startReply(m)}
                            aria-label="Balas pesan"
                            className={`${ICON_BTN} opacity-70 hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100`}
                          >
                            <ReplyIcon />
                          </button>
                        )}
                      </div>
                      {m.flagged && (
                        <p className={`mt-1.5 flex max-w-[86%] items-start gap-1.5 text-xs text-dc-clay sm:max-w-[72%] ${mine ? "text-right" : ""}`}>
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mt-0.5 shrink-0"
                            aria-hidden
                          >
                            <path d="M11 2 1 19h20L11 2ZM11 9v4M11 15.5h.01" />
                          </svg>
                          Pesan ini terdeteksi berisi kontak eksternal. Semua transaksi wajib lewat DuaCincin.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
              {conversation && <ClosedMarker conversation={conversation} currentUserId={currentUserId} />}
            </ol>
          )}
        </div>

        {/* Composer: stays at the bottom of the thread; safe-area aware in full-screen mode. */}
        <div className={`border-t border-dc-line bg-dc-white ${variant === "fill" ? "pb-[env(safe-area-inset-bottom)]" : ""}`}>
          {error && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3">
              <p role="alert" className="text-sm text-dc-danger">
                {error}
              </p>
              {messages.length === 0 && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className={`min-h-11 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline ${FOCUS}`}
                >
                  Coba lagi
                </button>
              )}
            </div>
          )}
          {closed && conversation ? (
            <ClosedNotice conversation={conversation} currentUserId={currentUserId} busy={sessionBusy} onReopen={() => setSession("reopen")} />
          ) : (
            <>
              {replyingTo && (
                <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg bg-dc-cream py-1 pl-3 pr-1">
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-dc-clay">Membalas {replyingTo.sender_id === currentUserId ? "pesanmu" : "pesan mereka"}</p>
                    <p className="truncate text-dc-text-2">{replyingTo.body || "Lampiran"}</p>
                  </div>
                  <button type="button" onClick={() => setReplyingTo(null)} aria-label="Batal membalas" className={ICON_BTN}>
                    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-end gap-1.5 p-2.5 sm:gap-2 sm:p-3">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAttachmentSelected} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Lampirkan gambar" disabled={sending} className={ICON_BTN}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 12.5V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h9.5" />
                    <path d="M3 15l4.5-4.5a2 2 0 0 1 2.8 0L14 14M13 13l1.5-1.5a2 2 0 0 1 2.8 0L19 13" />
                    <circle cx="17" cy="19" r="3" />
                    <path d="M17 17.8v2.4M15.8 19h2.4" />
                  </svg>
                </button>
                <textarea
                  ref={textRef}
                  rows={1}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends, Shift+Enter adds a line (skipped while an IME is composing).
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Tulis pesan"
                  aria-label="Tulis pesan"
                  className="max-h-33 min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border border-dc-line-strong bg-dc-ivory px-4 py-2.5 text-[0.95rem] leading-snug text-dc-black transition-[border-color,box-shadow] placeholder:text-dc-text-3 focus:border-dc-gold focus:shadow-[0_0_0_4px_rgba(184,146,74,0.18)] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Kirim pesan"
                  disabled={sending || !body.trim()}
                  aria-busy={sending || undefined}
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dc-ink text-dc-on-dark transition-[background-color,transform] hover:bg-dc-ink-2 disabled:bg-dc-ink/40 motion-safe:active:scale-95 ${FOCUS}`}
                >
                  {sending ? (
                    <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h13M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <Modal
          open={confirmClose}
          onClose={() => setConfirmClose(false)}
          title="Tutup sesi chat?"
          size="sm"
          description={`Selama sesi ditutup, kamu dan ${otherName} tidak bisa mengirim pesan baru. Riwayat pesan tetap tersimpan, dan kalian berdua bisa membuka sesinya lagi kapan saja.`}
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => setSession("close")} loading={sessionBusy}>
              Tutup sesi
            </Button>
          </div>
        </Modal>
      </div>
    </ChatSessionContext.Provider>
  );
}

function ReplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 17l-5-5 5-5" />
      <path d="M4 12h10a6 6 0 0 1 6 6v1" />
    </svg>
  );
}
