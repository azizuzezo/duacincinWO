"use client";

// /kirana: Kirana's own full-screen page. On desktop she stands live in 3D
// beside the conversation and acts it out (listens while you type, thinks,
// talks while the answer streams, cheers when it lands). On phones the chat
// fills the screen with her face in the header. A question arriving from
// the landing (?q=) is asked at once, then the address is cleaned so a
// refresh does not ask it again. History comes from the server (per device,
// or per account once logged in).
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { EASE, useReducedMotion } from "@/lib/motion";

import { ChatPanel } from "./ChatPanel";
import { EXAMPLES, ExampleIcon } from "./Composer";
import { Kirana3D, KiranaFace } from "./Kirana3D";
import type { Kirana3DMood } from "./KiranaScene";
import { useAsk, type Turn } from "./useAsk";

type AssistantTurn = Extract<Turn, { role: "assistant" }>;

export function KiranaChatPage() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const params = useSearchParams();
  const { turns, busy, loaded, send, stop, reset, retry } = useAsk();
  const input = useRef<HTMLTextAreaElement>(null);
  const [typing, setTyping] = useState(false);
  const [cheer, setCheer] = useState(false);
  const askedFromUrl = useRef(false);

  const lastAssistant = [...turns].reverse().find((t): t is AssistantTurn => t.role === "assistant");
  const streamingText = busy && !!lastAssistant?.parts.some((p) => p.kind === "text" && p.text.trim());
  const mood: Kirana3DMood = busy ? (streamingText ? "talking" : "thinking") : cheer ? "happy" : typing ? "listening" : turns.length === 0 ? "wave" : "idle";

  // The question carried over from the landing: ask it once, after the
  // history has loaded (so it lands after the earlier turns).
  useEffect(() => {
    const q = params.get("q");
    if (!loaded || askedFromUrl.current || !q) return;
    askedFromUrl.current = true;
    router.replace("/kirana", { scroll: false });
    void send(q);
  }, [loaded, params, router, send]);

  // Cheer for a moment when an answer lands.
  const wasBusy = useRef(false);
  const lastState = lastAssistant?.state;
  useEffect(() => {
    const ended = wasBusy.current && !busy && lastState === "done";
    wasBusy.current = busy;
    if (!ended) return;
    setCheer(true);
    const t = setTimeout(() => setCheer(false), 2600);
    return () => clearTimeout(t);
  }, [busy, lastState]);

  // Keep the composer ready to type.
  useEffect(() => {
    if (busy) return;
    const t = setTimeout(() => {
      const a = document.activeElement;
      if (!a || a === document.body) input.current?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(t);
  }, [busy, loaded]);

  const ask = useCallback((t: string) => void send(t), [send]);

  const welcome = (
    <div className="mx-auto max-w-xl py-4 text-center lg:py-10">
      <div className="mx-auto h-[150px] w-[140px] lg:hidden">
        <Kirana3D mood={mood} className="h-full w-full" />
      </div>
      <p className="mt-2 font-heading text-[2rem] font-semibold leading-tight text-dc-ink">
        Hai, aku <span className="dc-em">Kirana</span>.
      </p>
      <p className="mx-auto mt-2 max-w-[42ch] text-[0.98rem] leading-relaxed text-dc-text-2">
        Ceritakan rencana pernikahanmu. Aku carikan vendor yang terdaftar di DuaCincin, hitung budget, dan susun persiapannya.
      </p>
      <ul className="mt-6 grid gap-2.5 text-left sm:grid-cols-2">
        {EXAMPLES.map((ex, i) => (
          <motion.li key={ex.text} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.1 + i * 0.06 }}>
            <button
              type="button"
              onClick={() => ask(ex.text)}
              className="dc-glass group flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[0.92rem] font-semibold text-dc-ink transition-[transform,box-shadow,border-color] duration-300 ease-dc hover:border-dc-gold/70 hover:shadow-lift active:scale-[0.99] motion-safe:hover:-translate-y-0.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dc-white/80 group-hover:bg-dc-gold-soft">
                <ExampleIcon kind={ex.icon} />
              </span>
              <span className="min-w-0 flex-1">{ex.text}</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-dc-ivory">
      {/* The scene behind the glass: a real wedding photo, softened and warm. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, heavily blurred backdrop */}
        <img src="/photos/pinterest/pelaminan-kristal-sm.webp" alt="" className="h-full w-full scale-110 object-cover opacity-70 blur-2xl" />
        <div className="absolute inset-0 bg-linear-to-br from-dc-ivory/85 via-dc-ivory/50 to-dc-ivory/80" />
        <div className="dc-aurora is-a left-[-10%] top-[5%] h-[460px] w-[460px] bg-[#f3d2b8]/60" />
        <div className="dc-aurora is-b bottom-[-10%] right-[-5%] h-[520px] w-[520px] bg-[#e8cb8c]/45" />
      </div>

      {/* Slim top bar: home, title, account. */}
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full pr-2 text-dc-ink" aria-label="Kembali ke beranda DuaCincin">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
          <BrandLogo size={30} />
        </Link>
        <p className="font-heading text-lg font-semibold text-dc-ink sm:text-xl">
          Kirana <span className="hidden text-sm font-sans font-semibold text-dc-text-2 sm:inline">· asisten AI</span>
        </p>
        <Link href="/register?role=client" className="inline-flex min-h-11 items-center rounded-full bg-dc-ink px-4 text-sm font-semibold text-dc-on-dark hover:bg-dc-ink-2">
          Buat akun
        </Link>
      </header>

      <main id="konten" className="relative mx-auto grid min-h-0 w-full max-w-[1320px] flex-1 gap-6 px-0 pb-0 sm:px-4 sm:pb-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-8 lg:px-8 lg:pb-6">
        {/* Kirana, live, beside the conversation (desktop) */}
        <aside className="relative hidden min-h-0 flex-col items-center justify-center lg:flex">
          <div className="relative h-[min(62vh,560px)] w-full">
            <Kirana3D mood={mood} className="h-full w-full" />
            <AnimatePresence>
              {(cheer || typing || busy) && (
                <motion.p
                  key={cheer ? "cheer" : busy ? (streamingText ? "talk" : "think") : "typing"}
                  aria-hidden
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="dc-glass absolute right-[6%] top-[8%] whitespace-nowrap rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm font-semibold text-dc-ink"
                >
                  {cheer ? "Sudah siap!" : busy ? (streamingText ? "Ini dia…" : "Sebentar, aku carikan…") : "Aku dengarkan…"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <ul className="mt-2 flex flex-wrap justify-center gap-2 text-xs font-semibold text-dc-ink">
            {["Vendor terverifikasi saja", "Riwayat tersimpan", "Gratis"].map((b) => (
              <li key={b} className="dc-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-dc-clay">
                  <path d="m5 12 5 5 9-10" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
        </aside>

        {/* The conversation */}
        <motion.section
          aria-label="Percakapan dengan Kirana"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="dc-glass relative min-h-0 overflow-hidden rounded-t-[28px] sm:rounded-[32px]"
        >
          {!loaded ? (
            <div className="flex h-full items-center justify-center gap-3 text-sm font-semibold text-dc-text-2">
              <KiranaFace size={40} mood="thinking" />
              Membuka percakapanmu…
            </div>
          ) : (
            <ChatPanel
              turns={turns}
              busy={busy}
              onAsk={ask}
              onStop={stop}
              onRetry={retry}
              onReset={reset}
              onTyping={setTyping}
              input={input}
              sheet={false}
              onMinimize={() => {}}
              empty={welcome}
            />
          )}
        </motion.section>
      </main>
    </div>
  );
}
