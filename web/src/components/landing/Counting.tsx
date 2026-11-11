"use client";

// A number that counts to its value (on first sight and on every change), so
// a change is seen, not just its result. Only ever fed real numbers (API
// counts, the visitor's own budget). Reduced motion: shown at once.
import { animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

export function Counting({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const prev = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !seen) return;
    if (reduced) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, { duration: 0.8, ease: EASE, onUpdate: (v) => (el.textContent = format(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, format, reduced, seen]);
  return <span ref={ref}>{format(value)}</span>;
}
