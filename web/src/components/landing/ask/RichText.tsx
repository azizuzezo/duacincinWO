"use client";

// The assistant's words: paragraphs, "- " lists and **bold**, nothing else
// (the server prompt asks for exactly this). Rendered as React nodes, never
// as HTML, so model output can not inject markup.
//
// While a reply streams, the visible text eases toward what has arrived
// (useSmoothText): bursts from the network become an even flow instead of
// jumps, and a gold caret sits at the end. Reduced motion: shown as it arrives.
import { Fragment, useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/motion";

/** Words of a streamed reply arrive one by one (blur to sharp). Each word
 * keeps its key, so only the newly arrived ones animate. */
function words(text: string, key: string, animate: boolean) {
  if (!animate) return text;
  return text.split(/(\s+)/).map((w, i) =>
    /^\s+$/.test(w) || w === "" ? (
      w
    ) : (
      <span key={`${key}-w${i}`} className="dc-word">
        {w}
      </span>
    ),
  );
}

function inline(text: string, key: string, animate = false) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
    seg.startsWith("**") && seg.endsWith("**") && seg.length > 4 ? (
      <strong key={`${key}-${i}`} className="font-semibold text-wd-ink">
        {words(seg.slice(2, -2), `${key}-${i}`, animate)}
      </strong>
    ) : (
      <Fragment key={`${key}-${i}`}>{words(seg.replace(/\*\*/g, ""), `${key}-${i}`, animate)}</Fragment>
    ),
  );
}

/** Text revealed at a pace that catches up with the backlog. `animate` is
 * fixed at mount: text that was already there (a restored chat) shows whole,
 * text that streams in flows, and keeps flowing after the stream ends until
 * it has caught up. Returns the visible text and whether it is still behind. */
export function useSmoothText(target: string, animate: boolean): [string, boolean] {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() => (animate ? 0 : target.length));
  const shownRef = useRef(shown);
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const behind = !reduced && shown < target.length;

  useEffect(() => {
    if (!behind) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const backlog = targetRef.current.length - shownRef.current;
      if (backlog <= 0) return;
      // ~45 chars/s at rest, faster the more is waiting.
      const step = Math.max(1, Math.round(((45 + backlog * 4) * dt) / 1000));
      shownRef.current = Math.min(targetRef.current.length, shownRef.current + step);
      setShown(shownRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [behind]);

  return [reduced ? target : target.slice(0, shown), behind];
}

export function RichText({ text, live }: { text: string; live: boolean }) {
  const [visible, behind] = useSmoothText(text, live);
  const typing = live || behind;
  // Only a reply that streamed in while on screen animates its words.
  const [animate] = useState(live);
  const blocks = visible.split(/\n{2,}/);

  return (
    <div className="space-y-3 text-[1rem] leading-[1.75] text-wd-text">
      {blocks.map((b, bi) => {
        const lines = b.split("\n").filter((l) => l.trim() !== "");
        const isLast = bi === blocks.length - 1;
        const caret = isLast && typing ? <span aria-hidden className="dc-ask-caret" /> : null;
        if (lines.length > 0 && lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={bi} className="space-y-1.5 pl-1">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-3">
                  <span aria-hidden className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-wd-accent-deep" />
                  <span>
                    {inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), `${bi}-${li}`, animate)}
                    {li === lines.length - 1 && caret}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`, animate)}
              </Fragment>
            ))}
            {caret}
          </p>
        );
      })}
    </div>
  );
}
