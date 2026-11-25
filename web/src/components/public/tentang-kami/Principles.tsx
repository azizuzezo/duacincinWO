"use client";

// Visi perusahaan, "cara kami mewujudkannya": the three promises the product actually keeps, each
// next to the real screen where it happens. Tabs (Arrow/Home/End move, the
// panel swaps), no auto-advance. Motion purpose: the gold bar slides to the
// chosen promise and its screen dissolves in the same phone, so the change
// reads as the answer to the click. Reduced motion: instant swap.
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

import { PHONE_FRAME_RATIO, PhoneFrame } from "@/components/ui/DeviceFrame";
import { dissolve, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

export type Principle = {
  id: string;
  title: string;
  body: string;
  link: { href: string; label: string };
  screen: { src: string; alt: string };
};

export function Principles({ items }: { items: Principle[] }) {
  const [index, setIndex] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion() ?? false;
  const item = items[index];

  function go(i: number) {
    const n = (i + items.length) % items.length;
    setIndex(n);
    refs.current[n]?.focus();
  }
  function onKeyDown(e: KeyboardEvent) {
    const map: Record<string, number> = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (e.key in map) {
      e.preventDefault();
      go(map[e.key]);
    }
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <div role="tablist" aria-label="Cara kami mewujudkan visi" aria-orientation="vertical" onKeyDown={onKeyDown} className="flex flex-col gap-2">
          {items.map((p, i) => {
            const on = i === index;
            return (
              <button
                key={p.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`jaga-tab-${p.id}`}
                aria-selected={on}
                aria-controls="jaga-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setIndex(i)}
                className={`group relative flex min-h-16 items-start gap-4 rounded-[18px] px-5 py-4 text-left transition-[background-color,box-shadow] duration-300 ${
                  on ? "bg-white shadow-wd-card ring-1 ring-wd-line" : "hover:bg-white/70"
                }`}
              >
                {on && (
                  <motion.span
                    aria-hidden
                    layoutId={reduced ? undefined : "jaga-bar"}
                    transition={SPRING_SNAPPY}
                    className="absolute bottom-4 left-0 top-4 w-1 rounded-full bg-wd-accent"
                  />
                )}
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors duration-300 ${
                    on ? "bg-wd-accent text-wd-ink" : "bg-wd-blush text-wd-muted group-hover:text-wd-ink"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[1.1rem] font-semibold leading-snug ${on ? "text-wd-ink" : "text-wd-text"}`}>{p.title}</span>
                  {/* The open promise unfolds its explanation; the others stay one line. */}
                  <span
                    className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <span className="overflow-hidden">
                      <span className="mt-1.5 block max-w-[52ch] leading-relaxed text-wd-text">{p.body}</span>
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div id="jaga-panel" role="tabpanel" aria-labelledby={`jaga-tab-${item.id}`} className="mt-5 pl-5">
          <Link href={item.link.href} className="inline-flex min-h-11 items-center gap-2 text-[0.95rem] font-semibold text-wd-accent-ink underline decoration-wd-accent-line underline-offset-[6px] hover:text-wd-ink">
            {item.link.label}
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          {/* Phones: the screen of the open promise right under it. */}
          <div className="mt-6 flex justify-center rounded-[22px] bg-wd-accent-wash px-6 py-7 lg:hidden">
            {/* The whole phone, never a cropped stub. */}
            <div className="relative w-[min(58%,220px)]" style={{ aspectRatio: PHONE_FRAME_RATIO }}>
              <AnimatePresence initial={false}>
                <motion.div key={item.screen.src} className="absolute inset-0" {...dissolve(reduced)}>
                  <PhoneFrame src={item.screen.src} alt={item.screen.alt} sizes="220px" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden lg:col-span-5 lg:block">
        <div aria-hidden className="absolute inset-x-6 inset-y-10 -z-0 rounded-[32px] bg-wd-accent-wash" />
        <div className="relative mx-auto w-[280px]" style={{ aspectRatio: PHONE_FRAME_RATIO }}>
          <AnimatePresence initial={false}>
            <motion.div key={item.screen.src} className="absolute inset-0" {...dissolve(reduced)}>
              <PhoneFrame src={item.screen.src} alt={item.screen.alt} sizes="280px" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
