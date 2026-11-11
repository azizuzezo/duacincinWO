"use client";

import { motion } from "framer-motion";
import { useId, useRef } from "react";

import { EASE, MOTION, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

export type TabItem = { id: string; label: string; count?: number };

/**
 * Accessible tablist (WAI-ARIA tabs, automatic activation): one tab stop,
 * Left/Right/Home/End move and select. The active pill slides between tabs
 * (shared layout) so the eye follows the change. Scrolls horizontally on
 * narrow screens instead of wrapping. Render panels with <TabPanel>.
 *
 *   const [tab, setTab] = useState("aktif");
 *   <Tabs label="Status booking" items={items} value={tab} onChange={setTab} idBase="booking" />
 *   <TabPanel idBase="booking" id="aktif" value={tab}>...</TabPanel>
 */
export function Tabs({
  label,
  items,
  value,
  onChange,
  idBase,
  tone = "paper",
}: {
  label: string;
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Shared with TabPanel to link tab and panel ids. */
  idBase: string;
  tone?: "paper" | "ink";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion();
  const layoutId = useId();
  const index = Math.max(0, items.findIndex((t) => t.id === value));

  function go(i: number) {
    const next = (i + items.length) % items.length;
    onChange(items[next].id);
    refs.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (e.key in map) {
      e.preventDefault();
      go(map[e.key]);
    }
  }

  const dark = tone === "ink";

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`inline-flex gap-1 rounded-full p-1 ${dark ? "bg-dc-ink-2" : "bg-dc-cream"}`}
      >
        {items.map((t, i) => {
          const active = i === index;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`${idBase}-panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${
                active ? (dark ? "text-dc-ink" : "text-dc-on-dark") : dark ? "text-dc-on-dark/75 hover:text-dc-on-dark" : "text-dc-text-2 hover:text-dc-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={reduced ? undefined : layoutId}
                  transition={SPRING_SNAPPY}
                  className={`absolute inset-0 -z-0 rounded-full ${dark ? "bg-dc-gold-antique" : "bg-dc-ink"}`}
                  aria-hidden
                />
              )}
              <span className="relative">{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`relative rounded-full px-1.5 text-xs tabular-nums ${
                    active ? (dark ? "bg-dc-ink/15" : "bg-dc-on-dark/20") : dark ? "bg-dc-on-dark/10" : "bg-dc-white"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Panel for one tab. It rises in ("panel" preset, 280ms) when its tab is chosen, so the
 * content change reads as a consequence of the tap. Reduced motion: instant. */
export function TabPanel({ idBase, id, value, children, className = "" }: { idBase: string; id: string; value: string; children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (id !== value) return null;
  return (
    <motion.div
      role="tabpanel"
      id={`${idBase}-panel-${id}`}
      aria-labelledby={`${idBase}-tab-${id}`}
      tabIndex={0}
      className={`focus-visible:outline-offset-4 ${className}`}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION.panel, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
