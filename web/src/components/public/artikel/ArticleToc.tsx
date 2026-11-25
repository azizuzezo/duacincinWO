"use client";

import { useEffect, useState } from "react";

type Item = { id: string; title: string };

/** "Di artikel ini": the article's own h2 headings, read from the page after
 * it renders (the MDX body is the source, nothing is duplicated). Desktop: a
 * sticky list beside the text with the section being read marked in gold and
 * a small "n dari N". Phones: a fold-out list above the text. */
export function ArticleToc({ containerId }: { containerId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const hs = [...root.querySelectorAll<HTMLHeadingElement>("h2[id]")].filter((h) => !h.closest("aside"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- headings exist only after the MDX body renders
    setItems(hs.map((h) => ({ id: h.id, title: (h.firstChild?.textContent ?? h.textContent ?? "").trim() })));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-15% 0px -75% 0px" },
    );
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [containerId]);

  if (items.length < 2) return null;
  const at = items.findIndex((i) => i.id === active);

  const list = (
    <ol className="flex flex-col">
      {items.map((it, i) => {
        const on = it.id === active;
        return (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              aria-current={on ? "location" : undefined}
              className={`flex min-h-11 items-center border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors duration-300 ${
                on ? "border-wd-accent font-semibold text-wd-ink" : i < at ? "border-wd-accent-line text-wd-text hover:text-wd-ink" : "border-wd-line text-wd-text hover:border-wd-line-2 hover:text-wd-ink"
              }`}
            >
              {it.title}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <details className="group mb-8 rounded-[14px] border border-wd-line bg-white xl:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-wd-ink [&::-webkit-details-marker]:hidden">
          Di artikel ini ({items.length} bagian)
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" className="transition-transform group-open:rotate-180 motion-reduce:transition-none">
            <path d="M2 5l5 5 5-5" />
          </svg>
        </summary>
        <div className="px-3 pb-3">{list}</div>
      </details>
      <nav aria-label="Di artikel ini" className="sticky top-[150px] hidden xl:block">
        <p className="mb-3 flex items-baseline justify-between text-sm font-semibold text-wd-ink">
          Di artikel ini
          <span className="font-normal tabular-nums text-wd-muted">{at >= 0 ? `${at + 1} dari ${items.length}` : `${items.length} bagian`}</span>
        </p>
        {list}
      </nav>
    </>
  );
}
