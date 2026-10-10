"use client";

import { useRef } from "react";

/** Rating input as a proper radiogroup: one tab stop, arrow keys move and
 * select, Home/End jump. Filled stars are a graphic, so the 3:1 non-text
 * contrast of gold on white is what applies. */
export function StarInput({ value, onChange, label = "Rating" }: { value: number; onChange: (v: number) => void; label?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(to: number) {
    const next = Math.min(5, Math.max(1, to));
    onChange(next);
    refs.current[next - 1]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, star: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      move(star + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      move(star - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(1);
    } else if (e.key === "End") {
      e.preventDefault();
      move(5);
    }
  }

  // With nothing chosen yet, the first star is the tab stop.
  const tabStop = value >= 1 ? value : 1;

  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          ref={(el) => {
            refs.current[star - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} bintang`}
          tabIndex={star === tabStop ? 0 : -1}
          onClick={() => onChange(star)}
          onKeyDown={(e) => onKeyDown(e, star)}
          className="flex h-11 w-11 items-center justify-center rounded-md text-2xl leading-none transition-colors hover:bg-dc-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
        >
          <span aria-hidden className={star <= value ? "text-dc-gold" : "text-dc-ink/25"}>
            ★
          </span>
        </button>
      ))}
      <span className="ml-2 text-sm tabular-nums text-dc-black/70" aria-live="polite">
        {value > 0 ? `${value} dari 5` : "Belum dipilih"}
      </span>
    </div>
  );
}
