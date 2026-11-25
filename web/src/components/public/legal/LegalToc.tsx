"use client";

import { useEffect, useState } from "react";

/** Table of contents with scroll spy: the section being read is marked in
 * gold and the ones already passed keep a thin gold edge, with "n dari N"
 * above the list (purpose: in a long document the reader always knows where
 * they are and how much is left). A "back to top" link appears once the
 * reader is past the first section. */
export function LegalToc({ items, withHeader = false }: { items: { id: string; title: string }[]; withHeader?: boolean }) {
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

  const at = Math.max(0, items.findIndex((it) => it.id === active));

  return (
    <div>
      {withHeader && (
        <div className="mb-3">
          <p className="flex items-baseline justify-between text-sm font-semibold text-wd-ink">
            Daftar isi
            <span className="font-normal tabular-nums text-wd-muted">
              Bagian {at + 1} dari {items.length}
            </span>
          </p>
          <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-full bg-wd-line">
            <span className="block h-full origin-left rounded-full bg-wd-accent transition-transform duration-500 motion-reduce:transition-none" style={{ transform: `scaleX(${(at + 1) / items.length})` }} />
          </span>
        </div>
      )}
      <ol className="flex flex-col">
        {items.map((it, i) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={on ? "location" : undefined}
                className={`grid min-h-11 grid-cols-[1.75rem_1fr] items-center border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors duration-300 ${
                  on ? "border-wd-accent bg-wd-accent-wash font-semibold text-wd-ink" : i < at ? "border-wd-accent-line text-wd-text hover:text-wd-ink" : "border-wd-line text-wd-text hover:border-wd-line-2 hover:text-wd-ink"
                }`}
              >
                <span className={`tabular-nums ${on || i < at ? "text-wd-accent-ink" : "text-wd-muted"}`}>{i + 1}.</span>
                <span>{it.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
      {withHeader && at > 0 && (
        <a href="#konten" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wd-accent-ink underline decoration-wd-accent-line underline-offset-4 hover:text-wd-ink">
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
          Kembali ke atas
        </a>
      )}
    </div>
  );
}
