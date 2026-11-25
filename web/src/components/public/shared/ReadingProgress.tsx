"use client";

import { useEffect, useRef } from "react";

/** Thin gold line along the top of the viewport that fills as the reader
 * moves through `targetId` (an article or a legal document). Purpose: on a
 * long text the reader sees how much is left. It tracks the scroll directly
 * (no easing), so it never moves on its own and needs no reduced-motion
 * variant. Decorative for assistive tech: the headings carry the structure. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || !bar.current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return (
    <span aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[55] block h-[3px]">
      <span ref={bar} data-reading-progress className="block h-full origin-left bg-wd-accent-deep" style={{ transform: "scaleX(0)" }} />
    </span>
  );
}
