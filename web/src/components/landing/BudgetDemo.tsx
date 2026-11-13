"use client";

// Working preview of the real Budget Planner, rising out of a photo band of
// the reception the money is for: pick a total, pick a category, set its
// share. Same categories, defaults and proportional rescale as
// app/client/budget (lib/budget.ts), so what you try here is what the account
// does. No login, nothing is saved.
//
// Layout: one stacked allocation bar (the whole 100% at a glance), the
// selected category's editor (photo, big share, stepper + slider), and the
// category tiles that pick what the editor edits. The bar uses a landing-only
// tonal palette (ink to champagne, the brand's own gold family); the shared
// chart colors in lib/budget.ts stay untouched for the logged-in app.
//
// Motion purpose: the big numbers count to their new value (you see the
// change, not just the result); bar segments grow to their share; the
// selected tile's highlight slides (shared layout); the editor photo
// crossfades. Reduced motion: every change is instant.
import { AnimatePresence, animate, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { formatRupiah } from "@/lib/api";
import { BUDGET_CATEGORIES, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";
import { EASE, SPRING_SNAPPY, dissolve, useReducedMotion } from "@/lib/motion";

const PRESETS = [50_000_000, 100_000_000, 250_000_000, 500_000_000];

/** Landing-only look per category: a tonal ramp through the brand's gold
 * family (dark to light, in bar order) and a real photo where one exists. */
const LOOK: Record<BudgetCategoryKey, { tone: string; ink: string; photo?: string }> = {
  venue_catering: { tone: "#2b221c", ink: "#f6efe3", photo: "venue-joglo" },
  decor: { tone: "#5c4531", ink: "#f6efe3", photo: "dekorasi-taman" },
  photo_video: { tone: "#7a5c24", ink: "#fbf4e6", photo: "foto-gapura" },
  mua_attire: { tone: "#a07a3c", ink: "#15110d", photo: "rias-hijab" },
  entertainment: { tone: "#c29a52", ink: "#15110d", photo: "kirab-malam" },
  invitation_souvenir: { tone: "#dcc08a", ink: "#15110d", photo: "suvenir-anggrek" },
  reserve: { tone: "#eee2c8", ink: "#15110d" },
};

const BLURB: Record<BudgetCategoryKey, string> = {
  venue_catering: "Gedung atau taman, plus hidangan untuk tamu.",
  decor: "Pelaminan, bunga, dan suasana ruangan.",
  photo_video: "Dokumentasi akad dan resepsi.",
  mua_attire: "Rias, busana pengantin, dan keluarga.",
  entertainment: "Musik, MC, dan hiburan acara.",
  invitation_souvenir: "Undangan untuk tamu dan suvenir pulang.",
  reserve: "Dana jaga-jaga untuk biaya tak terduga.",
};

/** Tactile range input for the editor: a 10px rail, a 28px ivory thumb
 * ringed in gold. Self-contained (not .dc-slider, whose unlayered rules
 * would win over these utilities); the fill is set inline from the value. */
const SLIDER = [
  "h-2.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full outline-none",
  "[&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-webkit-slider-thumb]:-mt-[9px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-dc-gold [&::-webkit-slider-thumb]:bg-dc-white [&::-webkit-slider-thumb]:shadow-lift [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:hover:scale-110",
  "[&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
  "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-dc-gold [&::-moz-range-thumb]:bg-dc-white [&::-moz-range-thumb]:shadow-lift [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:hover:scale-110",
  "focus-visible:[&::-webkit-slider-thumb]:outline-2 focus-visible:[&::-webkit-slider-thumb]:outline-offset-3 focus-visible:[&::-webkit-slider-thumb]:outline-dc-ink",
  "focus-visible:[&::-moz-range-thumb]:outline-2 focus-visible:[&::-moz-range-thumb]:outline-offset-3 focus-visible:[&::-moz-range-thumb]:outline-dc-ink",
].join(" ");

function juta(n: number): string {
  return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
}

function pct(n: number): string {
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** A number that counts to its new value. */
function Counting({ value, format }: { value: number; format: (n: number) => string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, { duration: 0.7, ease: EASE, onUpdate: (v) => (el.textContent = format(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, format, reduced]);
  return <span ref={ref}>{format(value)}</span>;
}

/** Two interlocked rings: the brand motif, standing in for a photo on
 * "Cadangan" (there is nothing to photograph about a reserve). */
function RingsMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden className={className}>
      <circle cx="9" cy="8" r="6.2" />
      <circle cx="17" cy="8" r="6.2" />
    </svg>
  );
}

export function BudgetDemo() {
  const reduced = useReducedMotion();
  const [total, setTotal] = useState(100_000_000);
  const [categories, setCategories] = useState(defaultCategoryState());
  const [selected, setSelected] = useState<BudgetCategoryKey>("decor");

  const pctOf = (key: BudgetCategoryKey) => categories.find((c) => c.category === key)!.percentage;
  const sel = pctOf(selected);
  const selMeta = BUDGET_CATEGORIES.find((c) => c.key === selected)!;
  const selLook = LOOK[selected];
  const selAmount = Math.round((total * sel) / 100);
  const othersPct = Math.round((100 - sel) * 10) / 10;

  const setShare = (n: number) => setCategories((prev) => rescale(prev, selected, Math.round(n)));

  return (
    <section id="budget-demo" aria-labelledby="budget-judul" className="scroll-mt-16 bg-dc-ivory pb-20 sm:pb-28">
      {/* Photo band: the reception the money is for. */}
      <div className="dc-on-dark relative isolate overflow-hidden bg-dc-ink pb-44 pt-20 text-center text-dc-on-dark sm:pb-52 sm:pt-28">
        <Image src="/photos/pinterest/resepsi-taman.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-[50%_40%]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-dc-ink/75" />
        <Reveal className="dc-container">
          <p className="dc-eyebrow justify-center">Budget planner</p>
          <h2 id="budget-judul" className="mx-auto mt-4 max-w-3xl font-heading text-[clamp(2.5rem,5.6vw,4.8rem)] leading-[1] text-[#fbf6ec]">
            Coba bagi anggaranmu, <span className="dc-em-light">sekarang.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-[#fbf6ec]/90">Pilih kategori, atur porsinya. Kategori lain menyesuaikan, total tetap 100%.</p>
        </Reveal>
      </div>

      <div className="dc-container -mt-32 sm:-mt-40">
        <Reveal className="relative mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-dc-line bg-dc-white shadow-float">
            {/* Total + presets */}
            <div className="grid gap-5 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-dc-text-3">Total anggaran</p>
                <p className="mt-1 font-heading text-[clamp(2.75rem,8vw,4.25rem)] font-semibold leading-[0.95] text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                  <Counting value={total} format={juta} />
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2.5 md:w-[22rem]">
                <div role="group" aria-label="Pilihan total anggaran" className="grid grid-cols-4 gap-1 rounded-full bg-dc-cream p-1">
                  {PRESETS.map((p) => {
                    const on = total === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTotal(p)}
                        className="relative min-h-11 rounded-full px-1 text-sm font-semibold tabular-nums transition-[color,transform] duration-300 active:scale-95"
                      >
                        {on && <motion.span layoutId={reduced ? undefined : "budget-preset"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-0 rounded-full bg-dc-ink shadow-soft" />}
                        <span className={`relative ${on ? "text-dc-on-dark" : "text-dc-text-2"}`}>{p / 1_000_000} jt</span>
                      </button>
                    );
                  })}
                </div>
                <label className="flex min-h-12 items-center gap-2 rounded-full border border-dc-line-strong bg-dc-white px-5 transition-[border-color,box-shadow] duration-200 focus-within:border-dc-gold focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--dc-gold)_18%,transparent)] hover:border-dc-text-3">
                  <span className="text-sm font-semibold text-dc-text-3">Rp</span>
                  <span className="sr-only">Total anggaran dalam rupiah</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={total > 0 ? total.toLocaleString("id-ID") : ""}
                    placeholder="Atau ketik sendiri"
                    onChange={(e) => setTotal(Number(e.target.value.replace(/\D/g, "")) || 0)}
                    className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-semibold tabular-nums text-dc-black placeholder:font-normal placeholder:text-dc-text-3 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {/* The whole 100% in one bar. Decorative: the tiles below carry the same numbers as text. */}
            <div className="px-5 sm:px-8">
              <div aria-hidden className="flex h-12 gap-[3px] overflow-hidden rounded-xl sm:h-14">
                {BUDGET_CATEGORIES.map((meta) => {
                  const p = pctOf(meta.key);
                  const look = LOOK[meta.key];
                  const on = meta.key === selected;
                  return (
                    <div
                      key={meta.key}
                      className={`relative flex min-w-0 items-end overflow-hidden px-1.5 pb-1.5 sm:px-2 transition-[flex-grow,opacity] duration-500 ease-dc motion-reduce:transition-none ${p === 0 ? "hidden" : ""} ${on ? "opacity-100" : "opacity-[0.88]"}`}
                      style={{ flexGrow: p, flexBasis: 0, backgroundColor: look.tone, color: look.ink }}
                    >
                      {on && <span className="absolute inset-x-0 top-0 h-1 bg-dc-gold-antique" />}
                      {p >= 9 && <span className="truncate text-xs font-bold tabular-nums">{pct(Math.round(p))}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-8">
              {/* Editor for the selected category */}
              <div className="flex flex-col overflow-hidden rounded-xl bg-dc-cream md:order-2">
                <div className="relative aspect-[16/9] overflow-hidden bg-dc-paper-3 md:aspect-[16/10]">
                  <AnimatePresence initial={false}>
                    <motion.div key={selected} className="absolute inset-0" {...dissolve(reduced, 0.45)}>
                      {selLook.photo ? (
                        <Image src={`/photos/pinterest/${selLook.photo}.webp`} alt="" fill sizes="(min-width: 768px) 520px, 100vw" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#f6edda,#e9dfcc)]">
                          <RingsMark className="w-28 text-dc-gold" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-dc-ink/80 via-dc-ink/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-[#fbf6ec] sm:p-5">
                    <div className="min-w-0">
                      <p className="font-heading text-2xl font-semibold leading-tight sm:text-3xl">{selMeta.label}</p>
                      <p className="mt-0.5 text-sm text-[#fbf6ec]/85">{BLURB[selected]}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-5 p-4 sm:p-6">
                  <div className="flex items-end justify-between gap-3">
                    <p className="font-heading text-6xl font-semibold leading-[0.85] text-dc-ink [font-variant-numeric:lining-nums_tabular-nums] sm:text-7xl" aria-live="polite">
                      {pct(Math.round(sel))}
                    </p>
                    <p className="pb-1 text-right text-lg font-bold tabular-nums text-dc-ink sm:text-xl">
                      <Counting value={selAmount} format={juta} />
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShare(sel - 1)}
                      disabled={sel <= 0}
                      aria-label={`Kurangi porsi ${selMeta.label} 1 persen`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-dc-line-strong bg-dc-white text-xl font-semibold text-dc-ink shadow-soft transition-[transform,border-color] duration-200 hover:border-dc-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span aria-hidden>−</span>
                    </button>
                    <label htmlFor="demo-slider" className="sr-only">
                      Porsi {selMeta.label}
                    </label>
                    <input
                      id="demo-slider"
                      type="range"
                      min={0}
                      max={100}
                      value={sel}
                      onChange={(e) => setShare(Number(e.target.value))}
                      aria-valuetext={`${Math.round(sel)} persen, ${formatRupiah(selAmount)}`}
                      className={SLIDER}
                      style={{ background: `linear-gradient(to right, var(--dc-gold) ${sel}%, color-mix(in srgb, var(--dc-ink) 12%, transparent) ${sel}%)` }}
                    />
                    <button
                      type="button"
                      onClick={() => setShare(sel + 1)}
                      disabled={sel >= 100}
                      aria-label={`Tambah porsi ${selMeta.label} 1 persen`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-dc-line-strong bg-dc-white text-xl font-semibold text-dc-ink shadow-soft transition-[transform,border-color] duration-200 hover:border-dc-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span aria-hidden>+</span>
                    </button>
                  </div>

                  <p className="text-sm leading-relaxed text-dc-text-2">
                    Enam kategori lain berbagi <span className="font-semibold tabular-nums text-dc-ink">{pct(othersPct)}</span> (
                    <span className="font-semibold tabular-nums text-dc-ink">{juta(total - selAmount)}</span>) sesuai perbandingan sekarang.
                  </p>
                </div>
              </div>

              {/* Category tiles: pick what the editor edits */}
              <div className="md:order-1">
                <p className="mb-3 text-sm font-semibold text-dc-text-3">Pilih kategori</p>
                <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  {BUDGET_CATEGORIES.map((meta) => {
                    const p = pctOf(meta.key);
                    const look = LOOK[meta.key];
                    const on = meta.key === selected;
                    return (
                      <li key={meta.key} className={meta.key === "reserve" ? "min-[400px]:col-span-2 md:col-span-1 lg:col-span-2" : ""}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSelected(meta.key)}
                          className={`group relative flex min-h-16 w-full items-center gap-3 rounded-lg border p-2 pr-3 text-left transition-[border-color,transform] duration-200 active:scale-[0.98] ${
                            on ? "border-dc-gold" : "border-dc-line hover:border-dc-line-strong"
                          }`}
                        >
                          {on && <motion.span layoutId={reduced ? undefined : "budget-tile"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-0 rounded-[17px] bg-dc-gold-wash" />}
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-dc-cream">
                            {look.photo ? (
                              <Image src={`/photos/pinterest/${look.photo}-sm.webp`} alt="" fill sizes="48px" className="object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-dc-gold-soft">
                                <RingsMark className="w-7 text-dc-clay" />
                              </span>
                            )}
                            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: look.tone }} />
                          </span>
                          <span className="relative min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-dc-ink">{meta.label}</span>
                            <span className="mt-0.5 block text-sm tabular-nums text-dc-text-3">{juta((total * p) / 100)}</span>
                          </span>
                          <span className="relative font-heading text-2xl font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{pct(Math.round(p))}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
        <p className="mt-6 text-center">
          <Link href="/register?role=client" className="inline-flex min-h-11 items-center font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
            Simpan budget di akun client
          </Link>
        </p>
      </div>
    </section>
  );
}
