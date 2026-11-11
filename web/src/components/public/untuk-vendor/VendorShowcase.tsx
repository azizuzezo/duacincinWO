"use client";

// What a vendor gets, shown with the real vendor screens (captured from the
// WO app with the demo data of "Sanggar Rias Kencana"). A vertical tablist on
// desktop, a scrolling row on phones; the browser window swaps screens.
// Motion purpose: the gold bar slides to the chosen tab and the new screen
// rises in from below, so the change reads as a consequence of the choice.

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

import { BrowserFrame, PhoneFrame } from "@/components/ui/DeviceFrame";

export type ShowcaseItem = { id: string; title: string; body: string; src: string; alt: string; address: string; /** Same screen on a phone, shown below lg. */ phoneSrc: string };

export function VendorShowcase({ items }: { items: ShowcaseItem[] }) {
  const [value, setValue] = useState(items[0].id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion() ?? false;
  const index = Math.max(0, items.findIndex((t) => t.id === value));
  const item = items[index];

  function go(i: number) {
    const next = (i + items.length) % items.length;
    setValue(items[next].id);
    refs.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    if (e.key in map) {
      e.preventDefault();
      go(map[e.key]);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
      <div
        role="tablist"
        aria-label="Fitur dashboard vendor"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:col-span-4 lg:flex-col lg:gap-1 lg:overflow-visible"
      >
        {items.map((t, i) => {
          const on = i === index;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`vs-tab-${t.id}`}
              aria-selected={on}
              aria-controls="vs-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setValue(t.id)}
              className={`group relative min-h-11 shrink-0 rounded-xl px-4 py-3 text-left transition-colors duration-300 lg:py-4 lg:pl-6 ${
                on ? "bg-dc-white shadow-soft" : "hover:bg-dc-white/60"
              }`}
            >
              {on && (
                <motion.span
                  layoutId={reduced ? undefined : "vs-bar"}
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-dc-gold lg:inset-x-auto lg:bottom-3 lg:left-0 lg:top-3 lg:h-auto lg:w-1"
                />
              )}
              <span className={`block whitespace-nowrap font-heading text-[1.35rem] leading-tight lg:text-[1.6rem] ${on ? "text-dc-ink" : "text-dc-text-2"}`}>{t.title}</span>
              <span className="mt-1 hidden text-sm leading-relaxed text-dc-text-2 lg:block">{t.body}</span>
            </button>
          );
        })}
      </div>

      <div id="vs-panel" role="tabpanel" aria-labelledby={`vs-tab-${item.id}`} className="lg:col-span-8">
        <p className="mb-4 text-sm leading-relaxed text-dc-text-2 lg:hidden">{item.body}</p>
        {/* Desktop: the browser window. Holds the frame's exact height (bar +
            1280:800 screen) so swaps never shift the page. */}
        <div className="relative hidden lg:block">
          <div aria-hidden className="invisible border">
            <div className="h-8" />
            <div style={{ aspectRatio: "1280 / 800" }} />
          </div>
          <AnimatePresence initial={false}>
            <motion.div
              key={item.id}
              className="absolute inset-0"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: reduced ? 0.2 : 0.5, ease: EASE }}
            >
              <BrowserFrame src={item.src} alt={item.alt} address={item.address} />
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Phones and tablets: the same screen as it looks on a phone. */}
        <div className="relative flex justify-center overflow-hidden rounded-2xl bg-[radial-gradient(90%_70%_at_50%_100%,#ead7ae_0%,#f3ecdf_55%,#faf6ef_100%)] px-6 pt-8 lg:hidden">
          <div className="relative w-[min(78%,300px)]" style={{ aspectRatio: "300 / 552" }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={item.id}
                className="absolute inset-0"
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: -40 }}
                transition={{ duration: reduced ? 0.2 : 0.45, ease: EASE }}
              >
                <PhoneFrame src={item.phoneSrc} alt={item.alt} sizes="300px" crop="390 / 700" fade="from-dc-cream" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
