"use client";

// The conversation with Kirana: header, messages (text, cards, steps),
// follow-up chips, the save-your-plan prompt, and the composer at the foot.
// Full height on /kirana.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
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
        <span className="text-sm font-bold text-dc-ink">Kirana</span>
      </div>

      {(live || turn.steps.length > 0) && <Steps steps={turn.steps} finished={!live} />}

      {turn.parts.map((p, i) =>
        p.kind === "text" ? (
          p.text.trim() ? (
            <div key={i} className="max-w-[68ch] rounded-2xl rounded-tl-md border border-dc-line/70 bg-dc-white/92 px-4 py-3 shadow-soft sm:px-5">
              <RichText text={p.text} live={live && i === lastText && i === turn.parts.length - 1} />
            </div>
          ) : null
        ) : (
          <BlockView key={i} block={p.block} />
        ),
      )}

      {turn.state === "error" && (
        <>
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dc-danger/20 bg-dc-danger-soft px-4 py-3 text-sm text-dc-danger">
            <span className="font-semibold">{turn.error}</span>
            {last && (
              <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center rounded-full bg-dc-white px-4 font-semibold text-dc-ink shadow-soft hover:bg-dc-cream">
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
                className="dc-glass inline-flex min-h-11 items-center rounded-full px-4 text-left text-sm font-semibold text-dc-ink transition-[transform,border-color] duration-300 ease-dc hover:border-dc-gold active:scale-[0.98] motion-safe:hover:-translate-y-0.5"
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

  useEffect(() => {
    const el = scroller.current;
    if (!el || !stick.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [turns, reduced]);

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
      {sheet && <span aria-hidden className="absolute left-1/2 top-0 h-1.5 w-11 -translate-x-1/2 rounded-full bg-dc-ink/20" />}
      <div className="flex items-center justify-between gap-3 border-b border-dc-gold/20 px-4 pb-2.5 pt-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <KiranaFace size={42} mood={busy ? "thinking" : "idle"} />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold text-dc-ink">Kirana</p>
            <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-dc-success">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-dc-success ${busy ? "motion-safe:animate-pulse" : ""}`} />
              {busy ? "Sedang mengetik" : "Asisten AI DuaCincin"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {confirmReset ? (
            <span className="flex items-center gap-1 text-sm">
              <span className="hidden font-semibold text-dc-text-2 sm:inline">Hapus percakapan?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  onReset();
                }}
                className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-dc-danger hover:bg-dc-danger-soft"
              >
                Hapus
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-dc-text-2 hover:bg-dc-cream">
                Batal
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-dc-text-2 transition-colors hover:bg-dc-cream hover:text-dc-ink">
              <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Mulai baru
            </button>
          )}
          {sheet && (
            <button type="button" onClick={onMinimize} aria-label="Kecilkan percakapan" className="flex h-11 w-11 items-center justify-center rounded-full text-dc-text-2 hover:bg-dc-cream hover:text-dc-ink">
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
              <p className="max-w-[min(82%,560px)] whitespace-pre-wrap rounded-[22px] rounded-br-md bg-dc-ink px-4 py-3 text-[0.98rem] leading-relaxed text-dc-on-dark shadow-soft">{t.text}</p>
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
              className="dc-on-dark flex flex-col gap-4 rounded-2xl bg-dc-ink p-5 text-dc-on-dark sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div>
                <p className="font-heading text-2xl font-semibold leading-tight">
                  Suka rencananya? <span className="dc-em-light">Simpan di akunmu.</span>
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-dc-on-dark/80">Percakapan ini ikut pindah ke akunmu, plus Budget Planner, checklist, chat vendor, dan Wedding Consultant. Gratis.</p>
              </div>
              <ButtonLink href="/register?role=client" variant="gold" className="shrink-0">
                Buat akun client
              </ButtonLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p role="status" className="sr-only">
        {announce}
      </p>

      <div className="border-t border-dc-gold/20 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
        <Composer big={false} busy={busy} onSend={ask} onStop={onStop} onTyping={onTyping} inputRef={input} />
      </div>
    </div>
  );
}

