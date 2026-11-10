"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useRef } from "react";

import { motionSafe, sheetUp, slideIn, useReducedMotion } from "@/lib/motion";

import { useFocusTrap } from "./useFocusTrap";

/**
 * Bottom sheet on mobile, side panel (right, 440px) from `sm` up. For filters,
 * long forms, booking details, anything that should keep the page behind it
 * in view. Same keyboard contract as Modal (focus trap, Escape, restore focus).
 * `footer` is a sticky action row (e.g. "Terapkan filter").
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const titleId = useId();
  useFocusTrap(open, ref, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-end sm:items-stretch">
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
          {/* Two motion variants: mobile slides up, desktop slides in from the right. */}
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={motionSafe(reduced, typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches ? slideIn : sheetUp)}
            className="relative flex max-h-[88svh] w-full flex-col rounded-t-2xl bg-dc-white shadow-float sm:h-full sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-2xl"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-dc-line-strong sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-4 border-b border-dc-line px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
              <div>
                <h2 id={titleId} className="font-heading text-3xl leading-tight text-dc-ink">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-dc-text-2">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-3 transition-colors hover:bg-dc-cream hover:text-dc-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
            {footer && (
              <div className="border-t border-dc-line bg-dc-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
