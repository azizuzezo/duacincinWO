"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

export type NavItem = { id: string; label: string; count?: number };

/** Chip row that sticks under the header and marks the section being read
 * (scroll spy). Purpose: on a long page grouped in sections (FAQ topics,
 * credit groups, the about page) the reader always sees where they are and
 * can jump in one tap. The gold pill slides to the active chip; on phones
 * the row scrolls itself so the active chip stays in view. */
export function SectionNav({ items, label, className = "" }: { items: NavItem[]; label: string; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const reduced = useReducedMotion() ?? false;
  const row = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [items]);

  // Keep the active chip visible inside the horizontally scrolling row.
  useEffect(() => {
    const ul = row.current;
    const a = ul?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!ul || !a || ul.scrollWidth <= ul.clientWidth) return;
    ul.scrollTo({ left: a.offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  return (
    <nav aria-label={label} className={`sticky top-[121px] z-30 border-b border-wd-line bg-white/95 backdrop-blur-sm lg:top-[114px] ${className}`}>
      <ul ref={row} className="wd-container wd-rail flex gap-2 overflow-x-auto py-2.5 [scrollbar-width:none]">
        {items.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.id} className="shrink-0">
              <a
                href={`#${it.id}`}
                data-id={it.id}
                aria-current={on ? "location" : undefined}
                onClick={() => setActive(it.id)}
                className={`relative inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-300 ${
                  on ? "border-wd-accent text-wd-ink" : "border-wd-line-2 bg-white text-wd-ink hover:border-wd-ink"
                }`}
              >
                {on && (
                  <motion.span
                    aria-hidden
                    layoutId={reduced ? undefined : `snav-${label}`}
                    transition={SPRING_SNAPPY}
                    className="absolute inset-[-1px] -z-0 rounded-full bg-wd-accent"
                  />
                )}
                <span className="relative">{it.label}</span>
                {it.count !== undefined && <span className={`relative font-normal ${on ? "text-wd-ink" : "text-wd-muted"}`}>{it.count}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
