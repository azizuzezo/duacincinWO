"use client";

// What the assistant is doing, step by step ("Mencari MUA di Bandung"), so
// the wait shows real work instead of a spinner. While any step runs, the
// brand's two rings turn around each other; each finished step draws its
// check. Once the answer is done the list folds into one line that can be
// opened again ("3 langkah").
//
// Motion purpose: the rings = working; the check draw = this part is done;
// the fold = the work steps aside for the answer. Reduced motion: still
// rings, checks appear at once.
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

import type { Step } from "./useAsk";

export function OrbitRings({ size = 28, spinning = true }: { size?: number; spinning?: boolean }) {
  const reduced = useReducedMotion();
  const turn = spinning && !reduced;
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 32 32"
        className="absolute inset-0"
        animate={turn ? { rotate: 360 } : { rotate: 0 }}
        transition={turn ? { duration: 2.4, ease: "linear", repeat: Infinity } : { duration: 0.3 }}
      >
        <circle cx="12" cy="16" r="7.5" fill="none" stroke="var(--color-dc-gold)" strokeWidth="2.2" />
      </motion.svg>
      <motion.svg
        viewBox="0 0 32 32"
        className="absolute inset-0"
        animate={turn ? { rotate: -360 } : { rotate: 0 }}
        transition={turn ? { duration: 3.2, ease: "linear", repeat: Infinity } : { duration: 0.3 }}
      >
        <circle cx="20" cy="16" r="7.5" fill="none" stroke="var(--color-dc-ink)" strokeWidth="2.2" />
      </motion.svg>
    </span>
  );
}

function Check({ done }: { done: boolean }) {
  const reduced = useReducedMotion();
  return (
    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="wait">
        {done ? (
          <motion.svg
            key="done"
            viewBox="0 0 20 20"
            className="h-5 w-5"
            initial={{ scale: reduced ? 1 : 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <circle cx="10" cy="10" r="9" fill="var(--color-dc-gold-soft)" />
            <motion.path
              d="m6 10.2 2.6 2.6L14 7.4"
              fill="none"
              stroke="var(--color-dc-clay)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.36, delay: 0.08, ease: EASE }}
            />
          </motion.svg>
        ) : (
          <motion.span key="run" exit={{ opacity: 0, transition: { duration: 0.1 } }} className="h-2 w-2 rounded-full bg-dc-gold motion-safe:animate-pulse" />
        )}
      </AnimatePresence>
    </span>
  );
}

export function Steps({ steps, finished }: { steps: Step[]; finished: boolean }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const working = !finished && steps.some((s) => !s.done);
  const folded = finished && !open;

  if (steps.length === 0) {
    return finished ? null : (
      <div className="flex items-center gap-3 text-sm text-dc-text-2">
        <span className="dc-typing-dots inline-flex items-center rounded-full border border-dc-line/70 bg-dc-white/90 px-3 py-2.5 shadow-soft" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="dc-ask-shimmer font-semibold">Kirana sedang berpikir</span>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => finished && setOpen((o) => !o)}
        aria-expanded={finished ? open : undefined}
        disabled={!finished}
        className="group -ml-1 flex min-h-11 items-center gap-3 rounded-full pl-1 pr-3 text-left text-dc-text-2 transition-colors enabled:hover:bg-dc-cream disabled:cursor-default"
      >
        <OrbitRings spinning={working} />
        {finished ? (
          <span className="font-semibold">
            {steps.length} langkah selesai
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`ml-1.5 inline transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        ) : (
          <span className="dc-ask-shimmer font-semibold">{steps.find((s) => !s.done)?.label ?? "Menyusun jawaban"}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {!folded && (
          <motion.ol
            key="list"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: 0.32, ease: EASE } }}
            transition={{ duration: 0.4, ease: EASE }}
            className="ml-[13px] overflow-hidden border-l border-dc-line-strong pl-5"
          >
            {steps.map((s) => (
              <motion.li
                key={s.id}
                layout="position"
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.42, ease: EASE }}
                className="flex min-h-8 items-center gap-2.5 py-0.5"
              >
                <Check done={s.done} />
                <span className={s.done ? "text-dc-text-3" : "font-semibold text-dc-ink"}>{s.label}</span>
              </motion.li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
