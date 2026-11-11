"use client";

import { useEffect, useRef } from "react";

// Longest reveal in globals.css: 640ms block, or the 6th stagger step
// (330ms) + 520ms item, or the 1s photo settle. After it, the motion rules
// are dropped ("done") so hover/focus transitions inside are untouched.
const SETTLE_MS = 1100;

/** One-shot scroll reveal: the "reveal" preset of the motion system
 * (globals.css "Motion system"): blur-to-sharp + 20px rise for text blocks,
 * stagger + photo settle for a `.dc-stagger` list inside.
 *
 * Content is fully visible in the server HTML and without JS; only after
 * mount, and only for blocks that sit below the fold, is it hidden. It
 * starts revealing slightly BEFORE it enters the viewport (rootMargin +10%),
 * so a section is already arriving when it comes into view instead of
 * sitting blank on screen. Skipped entirely under prefers-reduced-motion. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    let settle = 0;
    el.dataset.reveal = "hidden";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        el.dataset.reveal = "shown";
        settle = window.setTimeout(() => {
          el.dataset.reveal = "done";
        }, SETTLE_MS + delay * 1000);
      },
      { rootMargin: "0px 0px 10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(settle);
    };
  }, [delay]);

  return (
    <div ref={ref} className={`dc-reveal ${className}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
