"use client";

// Small motion primitives for app pages (dashboards, lists, admin queues).
// Each one exists to explain a change of state, never to decorate:
// - MotionList / MotionItem: a list has loaded (rows arrive top-down), a row
//   was added, removed or filtered out (it leaves, neighbours close the gap).
// - CountUp: a hero number settles on its value, so the eye reads "this is
//   the figure that matters" and notices when it changes later.
// - SuccessPop: a real milestone just happened (saved, approved, sent).
// Transform and opacity only, presets from lib/motion MOTION (same rhythm as
// the CSS reveals in globals.css), exits ~60% of the enter.
// prefers-reduced-motion: everything renders in its final state at once.

import { animate, AnimatePresence, motion, useInView, type Variants } from "framer-motion";
import { useEffect, useLayoutEffect, useRef } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { EASE, MOTION, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

import { Rings } from "./Rings";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Same trigger as <Reveal>: starts just before the block enters the viewport,
// so it is already arriving when it comes into view (never blank on screen).
const VIEWPORT = { once: true, amount: 0, margin: "0px 0px 10% 0px" } as const;

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: MOTION.staggerStep, delayChildren: 0.03 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION.enter, ease: EASE } },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.2, ease: EASE } },
};

const staticVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
};

type ListTag = "ul" | "ol" | "div";
type ItemTag = "li" | "div" | "article";

/**
 * Staggered list. `inView` waits until the list scrolls into view (long public
 * pages); app pages play on mount because the list IS the content. Children
 * should be <MotionItem key=...>; removed or filtered items exit, the rest
 * slide into place (layout).
 */
export function MotionList({
  as = "ul",
  className = "",
  inView = false,
  children,
  ...aria
}: {
  as?: ListTag;
  className?: string;
  inView?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  role?: string;
}) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  const play = inView ? { whileInView: "visible", viewport: VIEWPORT } : { animate: "visible" };
  return (
    <Tag className={`relative ${className}`} initial={reduced ? false : "hidden"} {...play} variants={reduced ? undefined : listVariants} {...aria}>
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </Tag>
  );
}

export function MotionItem({
  as = "li",
  className = "",
  children,
  layout = true,
}: {
  as?: ItemTag;
  className?: string;
  children: React.ReactNode;
  /** false for items that change height often (keeps reflow cheap). */
  layout?: boolean;
}) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={reduced ? staticVariants : itemVariants}
      exit="exit"
      layout={!reduced && layout ? "position" : undefined}
      transition={{ layout: { duration: 0.3, ease: EASE } }}
    >
      {children}
    </Tag>
  );
}

/** Block that arrives once: when it scrolls into view (`inView`, the
 * default: the same "reveal" preset as the public pages, visible without JS
 * and never hidden when already on screen), or right away on mount ("enter"
 * preset). */
export function FadeIn({
  children,
  className = "",
  delay = 0,
  inView = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}) {
  const reduced = useReducedMotion();
  if (inView) {
    return (
      <Reveal className={className} delay={delay}>
        {children}
      </Reveal>
    );
  }
  // Same element and initial state on server and client (no hydration mismatch);
  // reduced motion only makes the transition instant, so content is never left hidden.
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: reduced ? { duration: 0 } : { duration: MOTION.enter, ease: EASE, delay } }}>
      {children}
    </motion.div>
  );
}

/** Horizontal bar (or stacked bar) that grows from its left edge once seen.
 * Children keep their real widths; only the wrapper scales (transform). */
export function GrowX({
  children,
  className = "",
  as = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  /** "span" inside inline parents. */
  as?: "div" | "span";
  "aria-hidden"?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    const Plain = as;
    return (
      <Plain className={`block ${className}`} {...rest}>
        {children}
      </Plain>
    );
  }
  const Tag = motion[as];
  return (
    <Tag
      className={`block origin-left ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1, transition: { duration: 0.4, ease: EASE, delay: 0.1 } }}
      viewport={VIEWPORT}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * A number that counts to its value the first time it is seen, and from the
 * old value to the new one when it changes. The server/first render already
 * holds the final text, so it is never wrong without JS.
 */
export function CountUp({
  value,
  format = (n: number) => Math.round(n).toLocaleString("id-ID"),
  className = "",
  duration = 0.4,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const seen = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const shown = useRef<number | null>(null);
  const fmt = useRef(format);
  useIsoLayoutEffect(() => {
    fmt.current = format;
  });

  // Before first paint, park the visible text at 0 so the count starts there.
  useIsoLayoutEffect(() => {
    if (reduced || !ref.current || shown.current !== null) return;
    if (value === 0) return;
    ref.current.textContent = fmt.current(0);
    shown.current = 0;
  }, [reduced, value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = fmt.current(value);
      shown.current = value;
      return;
    }
    if (!seen) return;
    const from = shown.current ?? value;
    if (from === value) {
      el.textContent = fmt.current(value);
      shown.current = value;
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: EASE,
      onUpdate: (n) => {
        el.textContent = fmt.current(n);
        shown.current = n;
      },
      onComplete: () => {
        el.textContent = fmt.current(value);
        shown.current = value;
      },
    });
    return () => controls.stop();
  }, [value, seen, reduced, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

/**
 * Success micro-celebration for a real milestone: the brand rings close in
 * and six small gold points burst once. Render it when the milestone happens
 * (e.g. `{saved && <SuccessPop />}`); it does not loop.
 */
export function SuccessPop({ className = "", tone = "gold" }: { className?: string; tone?: "gold" | "success" }) {
  const reduced = useReducedMotion();
  const color = tone === "success" ? "text-dc-success" : "text-dc-gold";
  if (reduced) {
    return (
      <span aria-hidden className={`inline-flex ${color} ${className}`}>
        <Rings className="h-7 w-11" stroke="currentColor" strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span aria-hidden className={`relative inline-flex ${color} ${className}`}>
      <motion.span initial={{ scale: 0.5, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={SPRING_SNAPPY}>
        <Rings className="h-7 w-11" stroke="currentColor" strokeWidth={1.6} />
      </motion.span>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 -ml-0.5 -mt-0.5 h-1 w-1 rounded-full bg-current"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
            animate={{ x: Math.cos(a) * 26, y: Math.sin(a) * 20, opacity: [0, 1, 0], scale: 1 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.08 }}
          />
        );
      })}
    </span>
  );
}
