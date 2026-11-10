"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useRef } from "react";

import { motionSafe, scaleIn, useReducedMotion } from "@/lib/motion";

import { useFocusTrap } from "./useFocusTrap";

/** Centered dialog for short decisions (confirm, a small form). Focus-trapped,
 * closes on Escape or backdrop click, restores focus to its trigger.
 * For long forms or filters on mobile, use Sheet instead. */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  useFocusTrap(open, dialogRef, onClose);

  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.button
            type="button"
            tabIndex={-1}
            aria-label="Tutup"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-dc-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={motionSafe(reduced, scaleIn)}
            className={`relative max-h-[calc(100svh-2rem)] w-full ${width} overflow-y-auto rounded-xl border border-dc-line bg-dc-white p-6 shadow-float sm:p-7`}
          >
            <h2 id={titleId} className="pr-10 font-heading text-3xl leading-tight text-dc-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm leading-relaxed text-dc-text-2">
                {description}
              </p>
            )}
            <div className="mt-5">{children}</div>
            {/* Close sits last in tab order so the first field gets focus on open. */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-3 top-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-3 transition-colors hover:bg-dc-cream hover:text-dc-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
