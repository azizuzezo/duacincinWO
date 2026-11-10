"use client";

// Animated progress marks for the client pages (private module, not a route).
// Purpose: a bar or ring fills from zero to its value once, so the eye reads
// "this much is done" as a change of state. Transform/stroke only (no width
// animation, keeps 60 fps). Reduced motion: drawn at the final value at once.

import { motion } from "framer-motion";

import { EASE, useReducedMotion } from "@/lib/motion";

const FILL = { duration: 0.9, ease: EASE, delay: 0.15 };

/** Horizontal progress bar. `pct` 0 to 100. The label goes on the wrapper via aria. */
export function GrowBar({
  pct,
  label,
  tone = "gold",
  className = "h-2.5",
}: {
  pct: number;
  label: string;
  tone?: "gold" | "danger" | "ink";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const value = Math.max(0, Math.min(100, pct));
  const color = tone === "danger" ? "bg-dc-danger" : tone === "ink" ? "bg-dc-ink" : "bg-dc-gold";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={`w-full overflow-hidden rounded-full bg-dc-cream ${className}`}
    >
      <motion.div
        className={`h-full origin-left rounded-full ${color}`}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: value / 100 }}
        transition={reduced ? { duration: 0 } : FILL}
      />
    </div>
  );
}

/** Circular progress with the percentage in the middle (also stated in nearby text). */
export function ProgressRing({ pct, size }: { pct: number; size: number }) {
  const reduced = useReducedMotion();
  const stroke = size > 64 ? 7 : 5;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, pct));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--dc-cream)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={value >= 100 ? "var(--dc-success)" : "var(--dc-gold)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={reduced ? { duration: 0 } : FILL}
        />
      </svg>
      <span aria-hidden className={`absolute font-heading text-dc-ink [font-variant-numeric:lining-nums] ${size > 64 ? "text-2xl" : "text-lg"}`}>
        {value}%
      </span>
    </span>
  );
}
