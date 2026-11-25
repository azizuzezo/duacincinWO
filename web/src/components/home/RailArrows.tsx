"use client";

import { useEffect, useState, type RefObject } from "react";

import { ArrowRight } from "./ui";

/** Prev / next buttons for a horizontal .wd-rail: glide one viewport-ish step, dim at the ends. */
export function RailArrows({ rail, label }: { rail: RefObject<HTMLElement | null>; label: string }) {
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    el.addEventListener("scroll", measure, { passive: true });
    // The observer also fires once right away, which takes the first measurement.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [rail]);

  const go = (dir: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="flex gap-2">
      {([-1, 1] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => !(dir < 0 ? edge.start : edge.end) && go(dir)}
          // aria-disabled, not disabled: a focused button that hits the end keeps focus.
          aria-disabled={dir < 0 ? edge.start : edge.end}
          aria-label={`${label} ${dir < 0 ? "sebelumnya" : "berikutnya"}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-wd-line-2 bg-white text-wd-ink transition-[background-color,color,opacity,border-color] duration-300 hover:border-wd-ink hover:bg-wd-ink hover:text-white active:scale-95 aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:border-wd-line-2 aria-disabled:hover:bg-white aria-disabled:hover:text-wd-ink"
        >
          <ArrowRight className={dir < 0 ? "rotate-180" : ""} />
        </button>
      ))}
    </div>
  );
}
