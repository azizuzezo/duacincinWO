"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import type { Article } from "@/content/artikel/registry";
import { EASE, useReducedMotion } from "@/lib/motion";

import { ArticleCard } from "./ArticleCard";

const chip = (on: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-5 text-sm font-semibold transition-colors duration-300 ${
    on ? "border-wd-accent bg-wd-accent text-wd-ink" : "border-wd-line-2 bg-white text-wd-ink hover:border-wd-ink"
  }`;

const norm = (s: string) => s.toLocaleLowerCase("id-ID");

/** Article grid with topic chips and a title search. Server HTML lists every
 * article; chips and search narrow the list on the client. Motion purpose:
 * cards that leave fade out and the rest slide into the gap, so the reader
 * sees the list being filtered rather than a jump cut. */
export function ArticleGrid({ articles }: { articles: Article[] }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of articles) m.set(a.topic, (m.get(a.topic) ?? 0) + 1);
    return m;
  }, [articles]);
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const reduced = useReducedMotion() ?? false;
  const needle = norm(q.trim());
  const shown = articles.filter((a) => (!topic || a.topic === topic) && (!needle || norm(`${a.title} ${a.description}`).includes(needle)));

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Saring menurut topik" className="wd-rail -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={!topic} onClick={() => setTopic("")} className={chip(!topic)}>
            Semua <span className="font-normal">{articles.length}</span>
          </button>
          {[...counts].map(([t, n]) => (
            <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(topic === t ? "" : t)} className={chip(topic === t)}>
              {t} <span className={`font-normal ${topic === t ? "" : "text-wd-muted"}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <label htmlFor="cari-artikel" className="sr-only">
            Cari artikel
          </label>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-wd-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id="cari-artikel"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari: seserahan, KUA, venue"
            className="min-h-11 w-full rounded-full border border-wd-line-2 bg-white pl-10 pr-4 text-base text-wd-ink placeholder:text-wd-muted focus:border-wd-accent-ink focus:outline-none sm:text-sm"
          />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {shown.length} artikel
      </p>
      {shown.length === 0 ? (
        <div className="mt-8 rounded-[20px] border border-dashed border-wd-line-2 p-6">
          <p className="font-semibold text-wd-ink">Belum ada artikel yang cocok</p>
          <p className="mt-1 text-wd-text">Coba kata lain atau pilih topik lain.</p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setTopic("");
            }}
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-wd-line-2 px-5 text-sm font-semibold text-wd-ink transition-colors hover:border-wd-ink"
          >
            Tampilkan semua artikel
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((a) => (
              <motion.li
                key={a.slug}
                layout={reduced ? false : "position"}
                initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <ArticleCard article={a} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}
