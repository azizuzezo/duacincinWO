"use client";

import { motion } from "framer-motion";

import { MotionItem, MotionList } from "@/components/ui/Motion";
import { Rings } from "@/components/ui/Rings";
import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

/** Work list that enters row after row on first paint, so the eye reads the
 * list top-down (most urgent first) instead of taking it in as one block.
 * Rows that leave (filter, accept, decline) exit and the rest close the gap.
 * Reduced motion: rows appear at once. */
export function StaggerList({ children, className = "grid gap-3" }: { children: React.ReactNode; className?: string }) {
  return <MotionList className={className}>{children}</MotionList>;
}

export function StaggerItem({ children }: { children: React.ReactNode }) {
  return <MotionItem>{children}</MotionItem>;
}

/** Success moment after the vendor accepts a booking: the two rings close
 * together (the brand motif, meaning "agreed") and the next step is named.
 * Celebrates the milestone without blocking anything. */
export function AcceptedMoment({ title, body }: { title: string; body: string }) {
  const reduced = useReducedMotion();
  return (
    <div role="status" className="flex items-center gap-4 rounded-xl border border-dc-success/30 bg-dc-success/[0.06] px-4 py-4 sm:px-5">
      <motion.span
        className="shrink-0 text-dc-success"
        initial={reduced ? false : { scale: 0.6, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={SPRING_SNAPPY}
      >
        <Rings className="h-9 w-14" stroke="currentColor" strokeWidth={1.6} />
      </motion.span>
      <div>
        <p className="font-semibold text-dc-ink">{title}</p>
        <p className="text-sm leading-relaxed text-dc-text-2">{body}</p>
      </div>
    </div>
  );
}
