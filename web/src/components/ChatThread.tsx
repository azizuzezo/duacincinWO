"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { apiGet, apiPost, apiWsUrl, ApiError, type ChatMessage } from "@/lib/api";

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
  const bottomRef = useRef<HTMLDivElement>(null);
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
      const msg = await apiPost<ChatMessage>(`/api/v1/conversations/${conversationId}/messages`, { body });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="p-6 text-center text-dc-black/60">Memuat percakapan…</p>;

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-dc-black/10 bg-dc-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-dc-black/50">Belum ada pesan. Mulai percakapan di bawah.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-dc-navy text-dc-white" : "bg-dc-offwhite text-dc-black"
                }`}
              >
                {m.body}
              </div>
              {mine && readUpToId === m.id && (
                <p className="mt-1 text-xs text-dc-black/40">Dibaca</p>
              )}
              {m.flagged && (
                <p className="mt-1 flex max-w-[80%] items-start gap-1.5 text-xs text-dc-gold">
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

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-dc-black/10 p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis pesan…"
          className="flex-1 rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
        />
        <Button type="submit" loading={sending} className="w-auto">
          Kirim
        </Button>
      </form>
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
