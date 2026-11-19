"use client";

// Conversation state for the landing assistant (server: internal/aiassist).
// One POST per visitor message, answered as Server-Sent Events: "step"
// (what the assistant is doing), "text" (a piece of the answer), "block" (a
// card built from real data), "error", "done". The conversation is kept on
// the server (per device cookie, or per account once logged in), so a
// visitor sees their history again without logging in. The server builds
// the model's history itself; the browser only sends the new message.
import { useCallback, useEffect, useRef, useState } from "react";

import { API_URL } from "@/lib/site";

export type VendorItem = {
  id: string;
  business_name: string;
  category: string;
  city: string;
  price_min: number;
  price_max: number;
  sample_image?: string;
  average_rating: number;
  review_count: number;
  reasons?: string[];
  images?: string[];
  description?: string;
};

export type Block =
  | { type: "vendors"; data: { label: string; city: string; total: number; query: { category: string; city?: string; max_price?: number }; items: VendorItem[] } }
  | { type: "inspirations"; data: { keyword: string; exact: boolean; items: { id: string; url: string; alt_text: string; caption: string; category: string }[] } }
  | { type: "budget"; data: { total: number; guests?: number; per_guest?: number; excluded?: string[]; lines: { key: string; label: string; percentage: number; amount: number }[] } }
  | { type: "timeline"; data: { title: string; steps: { when: string; title: string; detail: string }[] } }
  | { type: "articles"; data: { slugs: string[] } }
  | { type: "consultant"; data: { reason: string; category: string; label?: string; city: string; budget?: number; requested?: boolean; fallback?: boolean } };

export type Profile = { name: string; age: number };

export type Part = { kind: "text"; text: string } | { kind: "block"; block: Block };
export type Step = { id: string; label: string; done: boolean };

export type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; parts: Part[]; steps: Step[]; state: "streaming" | "done" | "error"; error?: string };

let seq = 0;
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

const AI = `${API_URL}/api/v1/ai`;

async function loadHistory(signal: AbortSignal): Promise<{ turns: Turn[]; profile: Profile | null }> {
  try {
    const res = await fetch(`${AI}/history`, { credentials: "include", signal, cache: "no-store" });
    if (!res.ok) return { turns: [], profile: null };
    const { turns, profile } = (await res.json()) as { turns: Turn[]; profile: Profile | null };
    return { turns: Array.isArray(turns) ? turns : [], profile: profile?.name ? profile : null };
  } catch {
    return { turns: [], profile: null };
  }
}

const NAME_KEY = "dc-kirana-name";

function readKnownName(): Profile | null {
  try {
    const p = JSON.parse(window.localStorage.getItem(NAME_KEY) ?? "null") as Profile | null;
    return p && typeof p.name === "string" && p.name ? { name: p.name, age: Number(p.age) || 0 } : null;
  } catch {
    return null;
  }
}

/** Saves the profile on the server (and in this browser as a fallback).
 * Returns the saved profile, or an error message to show. */
async function putProfile(name: string, age: number): Promise<Profile | string> {
  try {
    const res = await fetch(`${AI}/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age }),
    });
    const j = (await res.json()) as Profile & { error?: string };
    if (!res.ok) return j.error ?? "Belum bisa disimpan, coba lagi.";
    const saved = { name: j.name, age: j.age };
    try {
      window.localStorage.setItem(NAME_KEY, JSON.stringify(saved));
    } catch {
      /* storage blocked: the server copy is enough */
    }
    return saved;
  } catch {
    return "Koneksi terputus, coba lagi.";
  }
}

function appendText(parts: Part[], t: string): Part[] {
  const last = parts[parts.length - 1];
  if (last?.kind === "text") return [...parts.slice(0, -1), { kind: "text", text: last.text + t }];
  // Drop the paragraph break the server sends between rounds when nothing came before it.
  if (!t.trim() && (parts.length === 0 || last?.kind === "block")) return parts;
  return [...parts, { kind: "text", text: t.replace(/^\s+/, "") }];
}

export function useAsk() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    loadHistory(ctrl.signal).then(({ turns: t, profile: p }) => {
      if (ctrl.signal.aborted) return;
      // Keep anything sent before the history arrived.
      setTurns((now) => (now.length ? [...t, ...now] : t));
      // The server did not recognise this browser but it told Kirana its name
      // before (cookie cleared, new session...): reconnect quietly instead
      // of asking again.
      const known = p ?? readKnownName();
      setProfile(known);
      if (!p && known) void putProfile(known.name, known.age);
      setLoaded(true);
    });
    return () => {
      ctrl.abort();
      abort.current?.abort();
    };
  }, []);

  const patch = useCallback((id: string, fn: (t: Extract<Turn, { role: "assistant" }>) => Extract<Turn, { role: "assistant" }>) => {
    setTurns((all) => all.map((t) => (t.id === id && t.role === "assistant" ? fn(t) : t)));
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, 1000);
      if (!text || busy) return;

      const user: Turn = { id: uid(), role: "user", text };
      const reply: Turn = { id: uid(), role: "assistant", parts: [], steps: [], state: "streaming" };
      setTurns((all) => [...all, user, reply]);
      setBusy(true);
      const ctrl = new AbortController();
      abort.current = ctrl;

      const fail = (message: string) =>
        patch(reply.id, (t) => ({ ...t, state: "error", error: message, steps: t.steps.map((s) => ({ ...s, done: true })) }));

      try {
        const res = await fetch(`${AI}/chat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ message: text }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          let message = "Maaf, Kirana sedang ada kendala. Coba lagi sebentar, atau langsung chat Wedding Consultant kami.";
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error && res.status !== 500) message = j.error;
          } catch {
            /* not JSON */
          }
          fail(message);
          return;
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let finished = false;
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let cut: number;
          while ((cut = buf.indexOf("\n\n")) >= 0) {
            const frame = buf.slice(0, cut);
            buf = buf.slice(cut + 2);
            let event = "message";
            let data = "";
            for (const line of frame.split("\n")) {
              if (line.startsWith("event:")) event = line.slice(6).trim();
              else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            let payload: unknown = {};
            try {
              payload = data ? JSON.parse(data) : {};
            } catch {
              continue;
            }
            if (event === "text") {
              const t = (payload as { t: string }).t;
              patch(reply.id, (r) => ({ ...r, parts: appendText(r.parts, t) }));
            } else if (event === "block") {
              const b = payload as Block;
              patch(reply.id, (r) => ({ ...r, parts: [...r.parts, { kind: "block", block: b }] }));
            } else if (event === "step") {
              const s = payload as { id: string; label?: string; state: "run" | "done" };
              patch(reply.id, (r) =>
                r.steps.some((x) => x.id === s.id)
                  ? { ...r, steps: r.steps.map((x) => (x.id === s.id ? { ...x, done: s.state === "done" } : x)) }
                  : { ...r, steps: [...r.steps, { id: s.id, label: s.label ?? "", done: s.state === "done" }] },
              );
            } else if (event === "error") {
              fail((payload as { message: string }).message);
              finished = true;
            } else if (event === "done") {
              finished = true;
            }
          }
        }
        patch(reply.id, (r) => (r.state === "streaming" ? { ...r, state: "done", steps: r.steps.map((s) => ({ ...s, done: true })) } : r));
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          patch(reply.id, (r) => ({ ...r, state: "done", steps: r.steps.map((s) => ({ ...s, done: true })) }));
        } else {
          fail("Koneksi terputus. Periksa internetmu lalu coba lagi, atau chat Wedding Consultant kami.");
        }
      } finally {
        abort.current = null;
        setBusy(false);
      }
    },
    [busy, patch],
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  /** Ask the last question again (after a failed reply). */
  const retry = useCallback(() => {
    const lastUser = [...turns].reverse().find((t): t is Extract<Turn, { role: "user" }> => t.role === "user");
    if (!lastUser || busy) return;
    setTurns((all) => (all[all.length - 1]?.role === "assistant" && (all[all.length - 1] as Extract<Turn, { role: "assistant" }>).state === "error" ? all.slice(0, -2) : all));
    void send(lastUser.text);
  }, [turns, busy, send]);
  const reset = useCallback(() => {
    abort.current?.abort();
    setTurns([]);
    void fetch(`${AI}/history`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }, []);

  /** Remember who the visitor is (Kirana greets them by name next time). */
  const saveProfile = useCallback(async (name: string, age: number): Promise<string | null> => {
    const r = await putProfile(name, age);
    if (typeof r === "string") return r;
    setProfile(r);
    return null;
  }, []);

  return { turns, busy, loaded, profile, saveProfile, send, stop, reset, retry };
}
