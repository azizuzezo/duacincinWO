"use client";

import { useEffect, useState } from "react";

/** Table of contents with scroll spy: the section being read is marked in
 * gold (purpose: in a long document the reader always knows where they are). */
export function LegalToc({ items }: { items: { id: string; title: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [items]);

  return (
    <ol className="flex flex-col">
      {items.map((it, i) => {
        const on = it.id === active;
        return (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              aria-current={on ? "location" : undefined}
              className={`grid min-h-11 grid-cols-[1.75rem_1fr] items-center border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
                on ? "border-dc-gold font-semibold text-dc-ink" : "border-dc-line text-dc-text-2 hover:border-dc-line-strong hover:text-dc-ink"
              }`}
            >
              <span className={`tabular-nums ${on ? "text-dc-clay" : "text-dc-text-3"}`}>{i + 1}.</span>
              <span>{it.title}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
