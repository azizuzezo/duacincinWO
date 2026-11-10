"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Dialog keyboard contract shared by Modal and Sheet: moves focus inside on
 * open, keeps Tab inside, closes on Escape, locks page scroll, and gives focus
 * back to the element that opened it. */
export function useFocusTrap(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  // Latest onClose without re-running the effect: callers often pass an
  // inline arrow, and re-running would steal focus back to the first field.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement;
    const root = ref.current;
    const list = () => Array.from(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (list()[0] ?? root)?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = list();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [open, ref]);
}
