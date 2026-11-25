"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { CopyButton } from "@/components/public/shared/CopyButton";

export type Faq = { q: string; a: React.ReactNode; text: string };
export type Topic = { key: string; label: string; items: Faq[] };

/** Anchor for one question, stable across renders: "tanya-<topic>-<n>". */
export const faqId = (topic: string, i: number) => `tanya-${topic}-${i + 1}`;

const norm = (s: string) => s.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** FAQ grouped by topic, as native disclosure widgets (keyboard and screen
 * reader support come with the element, every answer is in the server HTML).
 * Added on the client:
 * - a search box that narrows the questions as you type (questions and
 *   answers are both searched) and opens the matches, with a count and an
 *   empty state;
 * - a smooth open/close where the browser supports animating <details>
 *   (height only, off under reduced motion);
 * - a "copy link" per question; opening a shared link (#tanya-...) opens
 *   and scrolls to that question. */
export function FaqList({ topics }: { topics: Topic[] }) {
  const [q, setQ] = useState("");
  const [hash, setHash] = useState("");
  const inputId = useId();

  useEffect(() => {
    const read = () => setHash(window.location.hash.slice(1));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // A shared question link opens its answer once the page is ready.
  useEffect(() => {
    if (!hash.startsWith("tanya-")) return;
    const el = document.getElementById(hash);
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ block: "center" });
      el.querySelector("summary")?.focus({ preventScroll: true });
    }
  }, [hash]);

  const needle = norm(q.trim());
  const shown = useMemo(
    () =>
      topics.map((t) => ({
        ...t,
        hits: t.items.map((f, i) => ({ f, i })).filter(({ f }) => !needle || norm(`${f.q} ${f.text}`).includes(needle)),
      })),
    [topics, needle],
  );
  const total = shown.reduce((n, t) => n + t.hits.length, 0);

  // While searching, the few matching answers open so they can be read at once.
  useEffect(() => {
    if (!needle) return;
    for (const t of shown) for (const { i } of t.hits) {
      const el = document.getElementById(faqId(t.key, i));
      if (el instanceof HTMLDetailsElement) el.open = true;
    }
  }, [needle, shown]);

  return (
    <div>
      <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label htmlFor={inputId} className="sr-only">
          Cari pertanyaan
        </label>
        <div className="relative flex-1">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-wd-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id={inputId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari: DP, komisi, sengketa, pencairan"
            className="min-h-12 w-full rounded-full border border-wd-line-2 bg-white pl-11 pr-4 text-base text-wd-ink placeholder:text-wd-muted focus:border-wd-accent-ink focus:outline-none"
          />
        </div>
        <p className="shrink-0 text-sm text-wd-muted" aria-live="polite">
          {needle ? `${total} pertanyaan cocok` : `${total} pertanyaan`}
        </p>
      </div>

      {total === 0 && (
        <div className="mt-8 rounded-[20px] border border-dashed border-wd-line-2 p-6">
          <p className="font-semibold text-wd-ink">Belum ada jawaban untuk &quot;{q}&quot;</p>
          <p className="mt-1 text-wd-text">Coba kata lain, atau tanyakan langsung ke wedding consultant lewat panel di samping.</p>
          <button type="button" onClick={() => setQ("")} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-wd-line-2 px-5 text-sm font-semibold text-wd-ink transition-colors hover:border-wd-ink">
            Hapus pencarian
          </button>
        </div>
      )}

      <div className="mt-10 flex flex-col gap-12">
        {shown.map((t, ti) =>
          t.hits.length === 0 ? null : (
            <section key={t.key} id={`topik-${t.key}`} aria-labelledby={`topik-${t.key}-judul`} className="scroll-mt-48">
              <h2 id={`topik-${t.key}-judul`} className="wd-title flex items-baseline gap-3 text-[1.35rem]">
                {t.label}
                <span className="text-sm font-normal text-wd-muted">{t.hits.length}</span>
              </h2>
              <div className="mt-4 border-b border-wd-line">
                {t.hits.map(({ f, i }) => {
                  const id = faqId(t.key, i);
                  return (
                    <details
                      key={f.q}
                      id={id}
                      open={(ti === 0 && i === 0) || undefined}
                      className="group scroll-mt-48 border-t border-wd-line [interpolate-size:allow-keywords] [&::details-content]:h-0 [&::details-content]:overflow-hidden [&::details-content]:transition-[height,content-visibility] [&::details-content]:duration-300 [&::details-content]:[transition-behavior:allow-discrete] motion-reduce:[&::details-content]:transition-none [&[open]::details-content]:h-auto"
                    >
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-4 text-left font-semibold text-wd-ink transition-colors hover:text-wd-accent-ink [&::-webkit-details-marker]:hidden">
                        <span>{f.q}</span>
                        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wd-blush text-wd-muted transition-[transform,background-color,color] duration-300 group-open:rotate-180 group-open:bg-wd-accent group-open:text-wd-ink group-hover:text-wd-ink motion-reduce:transition-none">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </summary>
                      <div className="flex items-start gap-3 pb-5">
                        <div className="max-w-2xl flex-1 leading-relaxed text-wd-text [&_a]:font-semibold [&_a]:text-wd-accent-ink [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-wd-ink">{f.a}</div>
                        <CopyButton hash={id} label={`Salin tautan ke pertanyaan: ${f.q}`} className="-mt-2.5" />
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
