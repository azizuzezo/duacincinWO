"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

export type Faq = { q: string; a: React.ReactNode; text: string };
export type Topic = {
  key: string;
  label: string;
  /** One line under the label on the topic card. */
  blurb: string;
  /** 24x24 stroke paths for FeatureIcon. */
  icon: React.ReactNode;
  /** Real app screen that shows this topic (web/public/showcase/pages). */
  screen: string;
  items: Faq[];
};

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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
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
export function HelpCenter({ topics, popular, aside }: { topics: Topic[]; /** Item ids ("<topic>-<index>") shown as popular questions. */ popular: string[]; aside?: React.ReactNode }) {
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
  const reduced = useReducedMotion() ?? false;

  function pickTopic(key: string) {
    setTopic(topic === key ? "" : key);
    setQuery("");
    document.getElementById("daftar-jawaban")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  function openPopular(id: string) {
    setQuery("");
    setTopic("");
    setOpen(id);
    // Wait one frame for the full list to render, then bring the answer into view.
    requestAnimationFrame(() => {
      const el = document.getElementById(`faq-${id}-q`);
      el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    });
  }

  const popularItems = popular
    .map((id) => {
      const [key, i] = [id.slice(0, id.lastIndexOf("-")), Number(id.slice(id.lastIndexOf("-") + 1))];
      const f = topics.find((t) => t.key === key)?.items[i];
      return f ? { id, q: f.q } : null;
    })
    .filter((x): x is { id: string; q: string } => x !== null);

  return (
    <div>
      {/* Search, lifted over the hero: the first thing to do here. */}
      <div className="relative z-10 -mt-8 rounded-2xl border border-dc-line bg-dc-white p-4 shadow-float sm:-mt-12 sm:p-6 lg:-mt-16">
        <label htmlFor="cari-bantuan" className="font-heading text-[1.6rem] leading-tight text-dc-ink">
          Cari jawaban
        </label>
        <div className="relative mt-3">
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
        {popularItems.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-dc-text-2">Sering ditanyakan</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {popularItems.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openPopular(p.id)}
                    className="inline-flex min-h-11 items-center rounded-full border border-dc-line-strong bg-dc-ivory px-4 text-left text-sm font-semibold text-dc-ink transition-[border-color,background-color,transform] duration-300 hover:border-dc-gold hover:bg-dc-white active:scale-[0.97]"
                  >
                    {p.q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Topics: real app screens of each area, a tap filters the list. */}
      <div role="group" aria-label="Pilih topik" className="dc-stagger mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {topics.map((t) => {
          const on = topic === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => pickTopic(t.key)}
              className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border text-left transition-[border-color,box-shadow,transform] duration-500 ease-dc motion-safe:hover:-translate-y-1 ${
                on ? "border-dc-ink shadow-lift" : "border-dc-line bg-dc-white shadow-soft hover:shadow-lift"
              }`}
            >
              <span aria-hidden className="relative block h-28 overflow-hidden bg-[radial-gradient(90%_80%_at_50%_100%,#ead7ae_0%,#f3ecdf_55%,#faf6ef_100%)] sm:h-36">
                <span className="absolute left-1/2 top-4 w-[62%] max-w-[150px] -translate-x-1/2 rounded-t-[1.4rem] bg-dc-ink p-[5px] pb-0 shadow-lift transition-transform duration-700 ease-dc group-hover:-translate-y-1.5">
                  <span className="relative block overflow-hidden rounded-t-[1.1rem] bg-dc-ivory" style={{ aspectRatio: "390 / 560" }}>
                    <Image src={t.screen} alt="" fill sizes="150px" className="object-cover object-top" />
                  </span>
                </span>
              </span>
              <span className={`relative flex flex-1 flex-col gap-2 p-4 sm:p-5 ${on ? "bg-dc-ink" : "bg-dc-white"}`}>
                <span className="-ml-1">
                  <FeatureIcon tone={on ? "ink" : "paper"}>{t.icon}</FeatureIcon>
                </span>
                <span className={`block font-heading text-[1.3rem] leading-tight sm:text-[1.45rem] ${on ? "text-dc-on-dark" : "text-dc-ink"}`}>{t.label}</span>
                <span className={`hidden text-sm leading-relaxed sm:block ${on ? "text-dc-on-dark/80" : "text-dc-text-2"}`}>{t.blurb}</span>
                <span className={`mt-auto text-sm font-semibold ${on ? "text-dc-gold-antique" : "text-dc-clay"}`}>
                  {on ? "Tampilkan semua topik" : `${t.items.length} pertanyaan`}
                </span>
              </span>
              {on && (
                <motion.span
                  layoutId={reduced ? undefined : "topik-aktif"}
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 bg-dc-gold"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div id="daftar-jawaban" className="min-w-0 scroll-mt-28 lg:col-span-8">
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
        <motion.div
          key={topic || "semua"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.36, ease: EASE }}
        >
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
        </motion.div>
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
      {aside && <div className="min-w-0 lg:col-span-4">{aside}</div>}
      </div>
    </div>
  );
}
