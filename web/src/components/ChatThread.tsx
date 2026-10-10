"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { FOCUS, ICON_BTN, INPUT, Skeleton } from "@/app/client/_ui";
import { Button } from "@/components/Button";
import { apiGet, apiPost, apiPostForm, apiWsUrl, ApiError, type ChatMessage } from "@/lib/api";

type IncomingEvent =
  | { type: "message.new"; message: ChatMessage }
  | { type: "read.updated"; user_id: string; last_read_message_id: string };

export function ChatThread({ conversationId, currentUserId }: { conversationId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readUpToId, setReadUpToId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMarkedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const msgs = await apiGet<ChatMessage[]>(`/api/v1/conversations/${conversationId}/messages`);
        if (!cancelled) setMessages(msgs ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat percakapan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const ws = new WebSocket(apiWsUrl(`/api/v1/conversations/${conversationId}/ws`));
    ws.onmessage = (evt) => {
      let data: IncomingEvent;
      try {
        data = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (data.type === "message.new") {
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      } else if (data.type === "read.updated" && data.user_id !== currentUserId) {
        setReadUpToId(data.last_read_message_id);
      }
    };
    ws.onerror = () => {
      // One-time reload as a fallback, no reconnect loop: this is a small
      // real-time nicety, not a delivery guarantee.
      load();
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    const last = messages[messages.length - 1];
    if (last && last.id !== lastMarkedRef.current) {
      lastMarkedRef.current = last.id;
      apiPost(`/api/v1/conversations/${conversationId}/read`, { last_read_message_id: last.id }).catch(() => {});
    }
  }, [messages, conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
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
      setError(err instanceof ApiError ? err.message : "Gagal mengirim pesan.");
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
      setError(err instanceof ApiError ? err.message : "Gagal mengunggah lampiran.");
    } finally {
      setSending(false);
    }
  }

  if (loading)
    return (
      <div role="status" aria-label="Memuat percakapan" className="flex h-[70vh] flex-col gap-3 rounded-lg border border-dc-ink/10 bg-dc-white p-4">
        <Skeleton className="h-10 w-2/3 self-start" />
        <Skeleton className="h-10 w-1/2 self-end" />
        <Skeleton className="h-10 w-3/5 self-start" />
      </div>
    );

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-96 flex-col rounded-lg border border-dc-ink/10 bg-dc-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-dc-black/70">Belum ada pesan. Mulai percakapan di bawah.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className="flex max-w-[80%] items-center gap-1.5">
                {mine && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(m)}
                    aria-label="Balas pesan"
                    className={`${ICON_BTN} h-11 w-11 opacity-60 hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${FOCUS}`}
                  >
                    <ReplyIcon />
                  </button>
                )}
                <div className={`rounded-lg px-3.5 py-2 text-sm ${mine ? "bg-dc-ink text-dc-white" : "bg-dc-cream text-dc-black"}`}>
                  {m.reply_to && (
                    <div className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs ${mine ? "border-dc-gold/60 bg-dc-white/10 text-dc-white/70" : "border-dc-ink/30 bg-dc-white text-dc-black/60"}`}>
                      {m.reply_to.body || "Lampiran"}
                    </div>
                  )}
                  {m.attachment_url && m.attachment_type?.startsWith("image/") && (
                    <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="mb-1.5 block">
                      <Image
                        src={m.attachment_url}
                        alt="Lampiran"
                        width={220}
                        height={220}
                        unoptimized
                        className="max-h-52 w-auto rounded-md object-cover"
                      />
                    </a>
                  )}
                  {m.body}
                </div>
                {!mine && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(m)}
                    aria-label="Balas pesan"
                    className={`${ICON_BTN} h-11 w-11 opacity-60 hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${FOCUS}`}
                  >
                    <ReplyIcon />
                  </button>
                )}
              </div>
              {mine && readUpToId === m.id && <p className="mt-1 text-xs text-dc-black/60">Dibaca</p>}
              {m.flagged && (
                <p className="mt-1 flex max-w-[80%] items-start gap-1.5 text-xs text-dc-clay">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <path d="M11 2 1 19h20L11 2ZM11 9v4M11 15.5h.01" />
                  </svg>
                  Pesan ini terdeteksi berisi kontak eksternal. Semua transaksi wajib lewat DuaCincin.
                </p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {replyingTo && (
        <div className="flex items-center justify-between border-t border-dc-ink/10 bg-dc-cream px-4 py-1 text-xs">
          <p className="truncate text-dc-black/70">
            Membalas: <span className="text-dc-ink">{replyingTo.body || "Lampiran"}</span>
          </p>
          <button type="button" onClick={() => setReplyingTo(null)} className={`inline-flex min-h-11 shrink-0 items-center px-2 font-semibold text-dc-ink ${FOCUS}`}>
            Batal
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-dc-ink/10 p-3">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAttachmentSelected} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Lampirkan gambar"
          disabled={sending}
          className={`${ICON_BTN} disabled:opacity-50`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.5V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h9.5" />
            <path d="M3 15l4.5-4.5a2 2 0 0 1 2.8 0L14 14M13 13l1.5-1.5a2 2 0 0 1 2.8 0L19 13" />
            <circle cx="17" cy="19" r="3" />
            <path d="M17 17.8v2.4M15.8 19h2.4" />
          </svg>
        </button>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis pesan…"
          aria-label="Tulis pesan"
          className={`${INPUT} min-w-0 flex-1`}
        />
        <Button type="submit" loading={sending} className="w-auto">
          Kirim
        </Button>
      </form>
      {error && (
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          {messages.length === 0 && (
            <button type="button" onClick={() => window.location.reload()} className={`min-h-11 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline ${FOCUS}`}>
              Coba lagi
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReplyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17l-5-5 5-5" />
      <path d="M4 12h10a6 6 0 0 1 6 6v1" />
    </svg>
  );
}
