"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/motion";

/** Long text shown up to `lines` lines with a soft fade, then "Lihat
 * selengkapnya" opens it with a height transition (instant under reduced
 * motion). Short text renders plain, with no button. The full text is always
 * in the HTML, so search engines and screen readers get all of it. */
export function ExpandableText({
  text,
  lines = 6,
  className = "",
  more = "Lihat selengkapnya",
  less = "Tampilkan lebih sedikit",
  fade = "from-white",
}: {
  text: string;
  lines?: number;
  className?: string;
  more?: string;
  less?: string;
  /** Gradient start matching the surface behind the text. */
  fade?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<number | null>(null);
  const [clamp, setClamp] = useState<number | null>(null);

  // Measure once laid out (and on resize): the clamp height is `lines` times
  // the computed line height; only text taller than that gets the toggle.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
      setClamp(Math.round(lh * lines));
      setFull(el.scrollHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines]);

  const long = clamp !== null && full !== null && full > clamp + 8;
  const height = !long ? undefined : open ? full! : clamp!;

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          id={id}
          style={{ maxHeight: height, transition: reduced ? "none" : "max-height 0.45s cubic-bezier(0.16,1,0.3,1)" }}
          className={`overflow-hidden whitespace-pre-line break-words ${className}`}
        >
          {text}
        </div>
        {long && !open && <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t ${fade} to-transparent`} />}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="-ml-2 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-wd-accent-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-wd-accent-ink"
        >
          {open ? less : more}
          <svg
            aria-hidden
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
