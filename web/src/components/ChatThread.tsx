"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { apiGet, apiPost, ApiError, type ChatMessage } from "@/lib/api";

export function ChatThread({ conversationId, currentUserId }: { conversationId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const msgs = await apiGet<ChatMessage[]>(`/api/v1/conversations/${conversationId}/messages`);
      setMessages(msgs ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat percakapan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // `load()` sets state, so it can't be called directly in an effect body —
    // schedule it as a microtask instead of invoking it synchronously here.
    queueMicrotask(load);
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const msg = await apiPost<ChatMessage>(`/api/v1/conversations/${conversationId}/messages`, { body });
      setMessages((prev) => [...prev, msg]);
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
              {m.flagged && (
                <p className="mt-1 max-w-[80%] text-xs text-dc-gold">
                  ⚠️ Pesan ini terdeteksi berisi kontak eksternal — semua transaksi wajib lewat DuaCincin.
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
