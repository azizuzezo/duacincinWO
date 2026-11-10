"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/Motion";
import { EASE, useReducedMotion } from "@/lib/motion";

export type Faq = { q: string; a: React.ReactNode; text: string };
export type Topic = { key: string; label: string; items: Faq[] };

// Search-miss suggestions (ui-ux-pro-max "No Results": never a dead end).
const SUGGEST = ["DP", "sengketa", "komisi", "konsultan"];

/** Lower-case, accent-free text for forgiving search ("sengketa" finds "Sengketa"). */
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = norm(text).indexOf(norm(q));
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-dc-gold/25 px-0.5 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function Item({ f, id, q, open, onToggle }: { f: Faq; id: string; q: string; open: boolean; onToggle: () => void }) {
  const reduced = useReducedMotion();
  return (
    <div className="border-t border-dc-line-strong">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="group flex min-h-16 w-full items-center justify-between gap-6 py-4 text-left font-heading text-[1.45rem] leading-snug text-dc-ink sm:text-[1.6rem]"
        >
          <span>
            <Mark text={f.q} q={q} />
          </span>
          <span
            aria-hidden
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color] duration-300 ${
              open ? "rotate-45 border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong text-dc-clay group-hover:border-dc-ink"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M7 1v12M1 7h12" />
            </svg>
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-a`}
            role="region"
            aria-labelledby={`${id}-q`}
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="max-w-2xl pb-6 pr-12 leading-relaxed text-dc-text-2 [&_a]:font-semibold [&_a]:text-dc-clay [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-dc-ink">
              {f.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Searchable, topic-filtered FAQ. Motion purpose: answers unfold in place
 * (height), so the reader never loses the question they opened. */
export function HelpCenter({ topics }: { topics: Topic[] }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const [topic, setTopic] = useState("");
  const [open, setOpen] = useState<string | null>(`${topics[0].key}-0`);
  // While searching every hit starts open; the reader can still fold each one.
  const [folded, setFolded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const nq = norm(q);
    return topics
      .filter((t) => !topic || t.key === topic)
      .map((t) => ({ ...t, hits: t.items.map((f, i) => ({ f, i })).filter(({ f }) => !nq || norm(`${f.q} ${f.text}`).includes(nq)) }))
      .filter((t) => t.hits.length > 0);
  }, [topics, topic, q]);
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  const chip = (on: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors duration-300 ${
      on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-ink hover:border-dc-ink"
    }`;

  return (
    <div>
      <div className="rounded-2xl border border-dc-line bg-dc-white p-4 shadow-lift sm:p-5">
        <label htmlFor="cari-bantuan" className="sr-only">
          Cari pertanyaan
        </label>
        <div className="relative">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dc-text-3">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id="cari-bantuan"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFolded(new Set());
            }}
            placeholder="Contoh: DP, sengketa, komisi"
            className="min-h-14 w-full rounded-xl border border-dc-line-strong bg-dc-ivory pl-12 pr-4 text-base text-dc-black placeholder:text-dc-text-3 focus:border-dc-gold focus:bg-dc-white focus:shadow-[0_0_0_4px_rgba(184,146,74,0.18)] focus:outline-none"
          />
        </div>
        <div role="group" aria-label="Topik" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={!topic} onClick={() => setTopic("")} className={chip(!topic)}>
            Semua topik
          </button>
          {topics.map((t) => (
            <button key={t.key} type="button" aria-pressed={topic === t.key} onClick={() => setTopic(topic === t.key ? "" : t.key)} className={chip(topic === t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-dc-text-3" aria-live="polite">
        {q ? `${total} jawaban untuk "${q}"` : `${total} pertanyaan`}
      </p>

      {groups.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-6 py-12 text-center">
          <p className="font-heading text-[1.75rem] leading-tight text-dc-ink">Belum ada jawaban untuk itu</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dc-text-2">
            Coba kata lain, atau tanyakan langsung ke wedding consultant DuaCincin.
          </p>
          <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-dc-text-3">
            Coba:
            {SUGGEST.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setQuery(w);
                  setTopic("");
                  setFolded(new Set());
                }}
                className="inline-flex min-h-11 items-center rounded-full border border-dc-line-strong bg-dc-white px-4 font-semibold text-dc-ink hover:border-dc-ink"
              >
                {w}
              </button>
            ))}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setTopic("");
              }}
            >
              Tampilkan semua pertanyaan
            </Button>
            <ButtonLink href="/client/consultation" size="sm">
              Tanya wedding consultant
            </ButtonLink>
          </div>
        </div>
      ) : (
        <FadeIn key={topic || "semua"} inView={false}>
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`topik-${g.key}`} className="mt-8 first-of-type:mt-4">
            <h2 id={`topik-${g.key}`} className="pb-3 text-sm font-semibold text-dc-clay">
              {g.label}
            </h2>
            <div className="border-b border-dc-line-strong">
              {g.hits.map(({ f, i }) => {
                const id = `${g.key}-${i}`;
                return (
                  <Item
                    key={id}
                    id={`faq-${id}`}
                    f={f}
                    q={q}
                    open={q ? !folded.has(id) : open === id}
                    onToggle={() => {
                      if (!q) return setOpen(open === id ? null : id);
                      const next = new Set(folded);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      setFolded(next);
                    }}
                  />
                );
              })}
            </div>
          </section>
        ))}
        </FadeIn>
      )}

      <p className="mt-10 text-sm text-dc-text-2">
        Rincian lengkap ada di{" "}
        <Link href="/legal/client-tos" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
          Ketentuan Layanan Client
        </Link>{" "}
        dan{" "}
        <Link href="/legal/vendor-agreement" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
          Perjanjian Kemitraan Vendor
        </Link>
        .
      </p>
    </div>
  );
}
