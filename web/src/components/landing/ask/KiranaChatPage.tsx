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

import { wdButton } from "@/components/home/ui";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { EASE, useReducedMotion } from "@/lib/motion";

import { ChatPanel } from "./ChatPanel";
import { EXAMPLES, ExampleIcon } from "./Composer";
import { Introduce, SKIP_KEY } from "./Introduce";
import { Kirana3D, KiranaFace } from "./Kirana3D";
import type { Kirana3DMood } from "./KiranaScene";
import { useAsk, type Turn } from "./useAsk";

type AssistantTurn = Extract<Turn, { role: "assistant" }>;

export function KiranaChatPage() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const params = useSearchParams();
  const { turns, busy, loaded, profile, saveProfile, send, stop, reset, retry } = useAsk();
  const [skipped, setSkipped] = useState(true);
  const [hello, setHello] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read a per-browser choice once
      setSkipped(window.localStorage.getItem(SKIP_KEY) === "1");
    } catch {
      setSkipped(false);
    }
  }, []);

  // A returning visitor gets a named hello from Kirana herself.
  useEffect(() => {
    if (!loaded || !profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- greet once the profile is known
    setHello(true);
    const t = setTimeout(() => setHello(false), 4200);
    return () => clearTimeout(t);
  }, [loaded, profile]);

  const askIntro = loaded && !profile && !skipped && turns.length === 0 && !params.get("q");
  function skipIntro() {
    try {
      window.localStorage.setItem(SKIP_KEY, "1");
    } catch {
      /* fine */
    }
    setSkipped(true);
  }
  const input = useRef<HTMLTextAreaElement>(null);
  const [typing, setTyping] = useState(false);
  const [cheer, setCheer] = useState(false);
  const askedFromUrl = useRef(false);

  const lastAssistant = [...turns].reverse().find((t): t is AssistantTurn => t.role === "assistant");
  const streamingText = busy && !!lastAssistant?.parts.some((p) => p.kind === "text" && p.text.trim());
  const mood: Kirana3DMood = busy ? (streamingText ? "talking" : "thinking") : cheer ? "happy" : typing ? "listening" : hello || turns.length === 0 ? "wave" : "idle";

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
    <div className="mx-auto max-w-xl py-2 text-center lg:py-8">
      <div className="mx-auto h-[140px] w-[130px] lg:hidden">
        <Kirana3D mood={mood} className="h-full w-full" />
      </div>
      {askIntro ? (
        <div className="mt-2">
          <Introduce onSave={saveProfile} onSkip={skipIntro} />
        </div>
      ) : (
        <>
          <p className="wd-kicker mt-2">Asisten AI pernikahan</p>
          <p className="wd-display mt-1 text-[clamp(2rem,4vw,2.6rem)] leading-[1.08]">
            {profile ? (
              <>
                Halo, <em>Kak {profile.name}</em>!
              </>
            ) : (
              <>
                Hai, aku <em>Kirana</em>.
              </>
            )}
          </p>
          <p className="mx-auto mt-3 max-w-[44ch] text-[0.98rem] leading-relaxed text-wd-text">
            {profile ? "Senang ketemu lagi. " : ""}Ceritakan rencana pernikahanmu. Aku carikan vendor yang terdaftar di DuaCincin, hitung budget, dan susun persiapannya.
          </p>
          <p className="mt-7 text-left text-sm font-semibold text-wd-ink">Coba tanyakan</p>
          <ul className="mt-2.5 grid gap-2.5 text-left sm:grid-cols-2">
            {EXAMPLES.map((ex, i) => (
              <motion.li key={ex.text} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.1 + i * 0.06 }}>
                <button
                  type="button"
                  onClick={() => ask(ex.text)}
                  className="group flex min-h-16 w-full items-center gap-3 rounded-[16px] border border-wd-line bg-white px-4 py-3 text-left text-[0.92rem] font-medium leading-snug text-wd-ink transition-[border-color,box-shadow,transform] duration-300 hover:border-wd-accent-line hover:shadow-wd-card active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wd-accent-wash transition-colors group-hover:bg-wd-accent-soft">
                    <ExampleIcon kind={ex.icon} />
                  </span>
                  <span className="min-w-0 flex-1">{ex.text}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  const notice = profile ? (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mx-auto flex w-fit items-center gap-2 rounded-full border border-wd-accent-line bg-wd-accent-wash py-1 pl-1 pr-3.5 text-sm font-medium text-wd-ink"
    >
      <KiranaFace size={28} mood="happy" />
      Halo lagi, Kak {profile.name}! Lanjut dari obrolan sebelumnya ya.
    </motion.div>
  ) : null;

  return (
    <div data-wd-public className="wd relative isolate flex h-[100dvh] flex-col overflow-hidden bg-wd-paper">
      <a href="#kirana-chat" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-wd-ink focus:px-4 focus:py-2 focus:text-white">
        Langsung ke percakapan
      </a>
      {/* Compact bar: the chat is the page, so no marketplace header here.
          Logo goes home, "Beranda" says so in words, then the account door. */}
      <header className="relative z-10 shrink-0 border-b border-wd-line bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1 sm:gap-4">
            <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex min-h-11 shrink-0 items-center rounded-md">
              <BrandLogo size={23} priority />
            </Link>
            <span aria-hidden className="hidden h-6 w-px bg-wd-line-2 sm:block" />
            <p className="hidden items-center gap-2 text-[0.95rem] font-semibold text-wd-ink sm:flex">
              Tanya Kirana
              <span className="rounded-full bg-wd-accent-soft px-2 py-0.5 text-[0.72rem] font-semibold text-wd-accent-ink">Asisten AI</span>
            </p>
          </div>
          <nav aria-label="Kirana" className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-wd-text transition-colors hover:bg-wd-blush hover:text-wd-ink">
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Beranda
            </Link>
            <Link href="/register?role=client" className={wdButton({ size: "sm", className: "px-5" })}>
              Buat akun
            </Link>
          </nav>
        </div>
      </header>

      <main id="konten" className="relative mx-auto grid min-h-0 w-full max-w-[1320px] flex-1 gap-6 px-0 pb-0 sm:px-4 sm:pb-4 sm:pt-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-8 lg:px-8 lg:pb-6 lg:pt-6">
        {/* Kirana, live, beside the conversation (desktop) */}
        <aside aria-label="Kirana" className="relative hidden min-h-0 flex-col overflow-hidden rounded-[28px] border border-wd-line bg-white lg:flex">
          {/* Soft champagne light behind her: the one warm spot on the page. */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_55%_at_50%_75%,var(--wd-accent-soft),transparent)]" />
          <div className="relative px-6 pt-6">
            <p className="wd-kicker">Kenalan dengan</p>
            <p className="wd-display text-[2rem] leading-none">
              <em>Kirana</em>
            </p>
            <p className="mt-2 max-w-[30ch] text-sm leading-relaxed text-wd-muted">Kirana mencari dari vendor terdaftar dan galeri inspirasi DuaCincin, lalu menyusunnya untukmu.</p>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
          <div className="relative z-10 h-[min(48vh,440px)] w-full">
            <Kirana3D mood={mood} className="h-full w-full" />
            <AnimatePresence>
              {(cheer || typing || busy || hello) && (
                <motion.p
                  key={cheer ? "cheer" : busy ? (streamingText ? "talk" : "think") : typing ? "typing" : "hello"}
                  aria-hidden
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="absolute right-[6%] top-[4%] whitespace-nowrap rounded-2xl rounded-bl-sm border border-wd-line bg-white px-3.5 py-2 text-sm font-medium text-wd-ink shadow-wd-card"
                >
                  {cheer ? "Sudah siap!" : busy ? (streamingText ? "Ini dia…" : "Sebentar, aku carikan…") : typing ? "Aku dengarkan…" : `Halo Kak ${profile?.name ?? ""}!`}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          {/* The stage she stands on: two interlocked gold rings lying flat.
              Drawn as a real object: the back halves sit behind Kirana, the
              front halves in front of her, so she stands inside the rings
              instead of being cut through by them. */}
          <div aria-hidden className="relative -mt-[130px] mb-4 h-28 w-[min(360px,86%)]">
            <div className="absolute inset-x-[8%] bottom-6 h-16 rounded-[50%] bg-[radial-gradient(closest-side,rgb(220_187_118_/_0.55),transparent)] blur-xl" />
            {(["back", "front"] as const).map((layer) => (
              <svg key={layer} viewBox="0 0 420 110" className={`absolute inset-0 h-full w-full ${layer === "front" ? "z-20" : "z-0"}`}>
                <defs>
                  <linearGradient id={`kirana-stage-${layer}`} x1="0" x2="1">
                    <stop offset="0" stopColor="#9c7731" />
                    <stop offset="0.5" stopColor="#f0d79c" />
                    <stop offset="1" stopColor="#9c7731" />
                  </linearGradient>
                  <clipPath id={`kirana-stage-clip-${layer}`}>
                    <rect x="0" y={layer === "back" ? 0 : 55} width="420" height="55" />
                  </clipPath>
                </defs>
                <g clipPath={`url(#kirana-stage-clip-${layer})`} fill="none" stroke={`url(#kirana-stage-${layer})`} strokeWidth="3" opacity={layer === "back" ? 0.75 : 0.95}>
                  <ellipse cx="170" cy="55" rx="140" ry="30" />
                  <ellipse cx="250" cy="55" rx="140" ry="30" />
                </g>
                {layer === "back" && (
                  <ellipse cx="210" cy="55" rx="190" ry="44" fill="none" stroke="#b8924a" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 7" className="dc-stage-spin" style={{ transformOrigin: "210px 55px" }} />
                )}
              </svg>
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="dc-sparkle absolute z-20 h-1.5 w-1.5 rounded-full bg-[#f0d79c]" style={{ left: `${14 + i * 18}%`, top: `${i % 2 ? 18 : 42}%`, animationDelay: `${i * 0.9}s` }} />
            ))}
          </div>
          </div>
        </aside>

        {/* The conversation */}
        <motion.section
          aria-label="Percakapan dengan Kirana"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          id="kirana-chat"
          tabIndex={-1}
          className="relative min-h-0 overflow-hidden bg-white outline-none sm:rounded-[28px] sm:border sm:border-wd-line sm:shadow-wd-card"
        >
          {!loaded ? (
            <div role="status" className="flex h-full items-center justify-center gap-3 text-sm font-medium text-wd-muted">
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
              notice={notice}
            />
          )}
        </motion.section>
      </main>
    </div>
  );
}
