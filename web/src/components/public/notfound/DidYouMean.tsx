"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type KnownPage = { path: string; label: string };

/** Edit distance, capped work: paths here are short. */
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** "Mungkin maksudmu": compares the address that was typed with the real
 * public pages (passed in from the server: fixed pages, article slugs and
 * category slugs) and offers the closest one when it is a near miss, e.g.
 * /artikle/checklist-persiapan-pernikahan. Shows nothing when no page is close. */
export function DidYouMean({ pages }: { pages: KnownPage[] }) {
  const [hit, setHit] = useState<KnownPage | null>(null);

  useEffect(() => {
    const typed = decodeURIComponent(window.location.pathname).toLowerCase().replace(/\/+$/, "");
    if (!typed || typed === "/") return;
    let best: KnownPage | null = null;
    let score = Infinity;
    for (const p of pages) {
      const d = distance(typed, p.path);
      if (d < score) {
        score = d;
        best = p;
      }
    }
    // A near miss: a few typos, relative to the length of the address.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is only known in the browser
    if (best && score > 0 && score <= Math.max(2, Math.round(best.path.length * 0.25))) setHit(best);
  }, [pages]);

  if (!hit) return null;
  return (
    <p className="mx-auto mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 rounded-full bg-wd-accent-wash px-5 py-2.5 text-wd-text ring-1 ring-wd-accent-soft">
      Mungkin maksudmu
      <Link href={hit.path} className="inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
        {hit.label}
      </Link>
    </p>
  );
}
