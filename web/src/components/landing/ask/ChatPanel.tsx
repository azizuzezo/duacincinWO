"use client";

// The conversation with Kirana: header, messages (text, cards, steps),
// follow-up chips, the save-your-plan prompt, and the composer at the foot.
// Full height on /kirana.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import Link from "next/link";

import { wdButton } from "@/components/home/ui";
import { EASE, useReducedMotion } from "@/lib/motion";

import { BlockView } from "./blocks";
import { Composer } from "./Composer";
import { KiranaFace } from "./Kirana3D";
import { RichText } from "./RichText";
import { Steps } from "./Steps";
import type { Turn } from "./useAsk";

type AssistantTurn = Extract<Turn, { role: "assistant" }>;

function followUps(turn: AssistantTurn): string[] {
  const types = new Set(turn.parts.flatMap((p) => (p.kind === "block" ? [p.block.type] : [])));
  const out: string[] = [];
  if (types.has("budget")) out.push("Vendor apa yang paling dulu harus dibooking?", "Carikan venue yang sesuai budget ini", "Versi hemat dong");
  if (types.has("vendors")) out.push("Bandingkan vendor-vendor ini", "Carikan juga dekorasi di kota yang sama");
  if (types.has("inspirations")) out.push("Vendor dekor yang cocok untuk konsep ini?", "Palet warna yang cocok apa?");
  if (types.has("timeline")) out.push("Berapa kira-kira budget yang perlu disiapkan?");
  if (types.has("consultant")) out.push("Apa saja yang bisa dibantu Wedding Consultant?", "Coba cari di kategori lain");
  if (out.length === 0) out.push("Bantu hitung budget pernikahanku", "Carikan vendor di kotaku");
  return out.slice(0, 3);
}

function AssistantTurnView({ turn, last, onAsk, onRetry }: { turn: AssistantTurn; last: boolean; onAsk: (t: string) => void; onRetry: () => void }) {
  const reduced = useReducedMotion();
  const live = turn.state === "streaming";
  const lastText = turn.parts.map((p) => p.kind).lastIndexOf("text");
  return (
    <motion.div initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className="space-y-4">
      <div className="flex items-center gap-2.5">
        <KiranaFace size={40} mood={live ? "thinking" : last && turn.state === "done" ? "happy" : "idle"} />
        <span className="text-sm font-semibold text-wd-ink">Kirana</span>
      </div>

      {(live || turn.steps.length > 0) && <Steps steps={turn.steps} finished={!live} />}

      {turn.parts.map((p, i) =>
        p.kind === "text" ? (
          p.text.trim() ? (
            <div key={i} className="max-w-[68ch] rounded-[20px] rounded-tl-md border border-wd-line bg-wd-paper px-4 py-3 sm:px-5">
              <RichText text={p.text} live={live && i === lastText && i === turn.parts.length - 1} />
            </div>
          ) : null
        ) : (
          <BlockView key={i} block={p.block} />
        ),
      )}

      {turn.state === "error" && (
        <>
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-wd-danger/20 bg-[#fbeceb] px-4 py-3 text-sm text-wd-danger">
            <span className="font-semibold">{turn.error}</span>
            {last && (
              <button type="button" onClick={onRetry} className={wdButton({ variant: "outline", size: "sm" })}>
                Coba lagi
              </button>
            )}
          </div>
          {/* Whatever went wrong on Kirana's side, a person can still help. */}
          {last && !turn.parts.some((p) => p.kind === "block" && p.block.type === "consultant") && (
            <BlockView block={{ type: "consultant", data: { reason: "", category: "", city: "", fallback: true } }} />
          )}
        </>
      )}

      <AnimatePresence>
        {last && turn.state === "done" && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASE }}
            className="flex flex-wrap gap-2 pt-1"
          >
            {followUps(turn).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAsk(q)}
                className="inline-flex min-h-11 items-center rounded-full border border-wd-accent-line bg-white px-4 text-left text-sm font-medium text-wd-ink transition-[background-color,border-color,transform] duration-300 hover:border-wd-accent-ink hover:bg-wd-accent-wash active:scale-[0.98]"
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** The conversation: header, messages, composer. Inline on desktop, a
 * bottom sheet on phones. */
export function ChatPanel({
  turns,
  busy,
  onAsk,
  onStop,
  onRetry,
  onReset,
  onTyping,
  input,
  sheet,
  onMinimize,
  empty,
  notice,
}: {
  turns: Turn[];
  busy: boolean;
  onAsk: (t: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onReset: () => void;
  onTyping: (t: boolean) => void;
  input: React.RefObject<HTMLTextAreaElement | null>;
  sheet: boolean;
  onMinimize: () => void;
  /** Shown in the message area before the first question. */
  empty?: React.ReactNode;
  /** Shown above the conversation (e.g. "Halo lagi, Kak Rina!"). */
  notice?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const answered = turns.some((t) => t.role === "assistant" && t.state === "done" && t.parts.some((p) => p.kind === "block"));
  const lastAssistant = [...turns].reverse().find((t): t is AssistantTurn => t.role === "assistant");
  const announce = busy
    ? "Kirana sedang menjawab"
    : (lastAssistant?.parts ?? [])
        .map((p) => (p.kind === "text" ? p.text : ""))
        .join(" ")
        .replace(/\*\*/g, "")
        .slice(0, 600);

  // Opening with a saved conversation: land on the latest message at once,
  // before paint, instead of gliding down from the top. Later turns (new
  // questions, streaming answers) still glide.
  const opened = useRef(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || turns.length === 0) return;
    if (!opened.current) {
      opened.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (!stick.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [turns, reduced]);

  // Cards and photos in the history grow after they load: keep the view
  // pinned to the bottom while the reader has not scrolled up.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    const watchAll = () => {
      for (const child of Array.from(el.children)) ro.observe(child);
    };
    watchAll();
    // New turns are added as new children: watch them too.
    const mo = new MutationObserver(watchAll);
    mo.observe(el, { childList: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }
  function ask(t: string) {
    stick.current = true;
    onAsk(t);
  }

  return (
    <div className="relative flex h-full flex-col">
      {sheet && <span aria-hidden className="absolute left-1/2 top-0 h-1.5 w-11 -translate-x-1/2 rounded-full bg-wd-ink/20" />}
      <div className="flex items-center justify-between gap-3 border-b border-wd-line px-4 pb-2.5 pt-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <KiranaFace size={42} mood={busy ? "thinking" : "idle"} />
          <div className="min-w-0 leading-tight">
            <p className="text-[0.95rem] font-semibold text-wd-ink">Kirana</p>
            <p className="flex items-center gap-1.5 truncate text-xs font-medium text-wd-muted">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${busy ? "bg-wd-accent-deep motion-safe:animate-pulse" : "bg-wd-ok"}`} />
              {busy ? "Sedang mengetik" : "Asisten AI DuaCincin"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {confirmReset ? (
            <span className="flex items-center gap-1 text-sm">
              <span className="hidden font-medium text-wd-text sm:inline">Hapus percakapan?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  onReset();
                }}
                className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-wd-danger hover:bg-[#fbeceb]"
              >
                Hapus
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-wd-text hover:bg-wd-blush">
                Batal
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} disabled={turns.length === 0} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-wd-text transition-colors hover:bg-wd-blush hover:text-wd-ink disabled:opacity-40 disabled:hover:bg-transparent">
              <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Mulai baru
            </button>
          )}
          {sheet && (
            <button type="button" onClick={onMinimize} aria-label="Kecilkan percakapan" className="flex h-11 w-11 items-center justify-center rounded-full text-wd-text hover:bg-wd-blush hover:text-wd-ink">
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div ref={scroller} onScroll={onScroll} aria-busy={busy} className="flex-1 space-y-8 overflow-y-auto overscroll-contain px-4 py-6 sm:px-7 sm:py-7">
        {turns.length > 0 && notice}
        {turns.length === 0 && empty}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <motion.div
              key={t.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.9 }}
              style={{ originX: 1, originY: 1 }}
              className="flex justify-end"
            >
              <p className="max-w-[min(82%,560px)] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-wd-accent-soft px-4 py-3 text-[0.98rem] leading-relaxed text-wd-ink">{t.text}</p>
            </motion.div>
          ) : (
            <AssistantTurnView key={t.id} turn={t} last={i === turns.length - 1} onAsk={ask} onRetry={onRetry} />
          ),
        )}

        <AnimatePresence>
          {answered && !busy && (
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
              className="flex flex-col gap-4 rounded-[22px] border border-wd-accent-line bg-wd-accent-wash p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div>
                <p className="wd-display text-[1.6rem] leading-tight">
                  Suka rencananya? <em>Simpan di akunmu.</em>
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-wd-text">Percakapan ini ikut pindah ke akunmu, plus Budget Planner, checklist, chat vendor, dan Wedding Consultant. Gratis.</p>
              </div>
              <Link href="/register?role=client" className={wdButton({ className: "shrink-0" })}>
                Buat akun client
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p role="status" className="sr-only">
        {announce}
      </p>

      <div className="border-t border-wd-line bg-white px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
        <Composer big={false} busy={busy} onSend={ask} onStop={onStop} onTyping={onTyping} inputRef={input} />
      </div>
    </div>
  );
}

