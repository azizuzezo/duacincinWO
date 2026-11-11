"use client";

// Working preview of the real Budget Planner, dressed as the product panel it
// is, rising out of a photo band of the reception the money is for: pick a
// total, pick a category, slide its share. Same proportional
// rescale and same category colors as app/client/budget (lib/budget.ts), so
// what you try here is what the account does. No login, nothing is saved.
//
// Motion purpose: the big numbers count to their new value (you see the
// change, not just the result); donut arcs and bars grow to their share; the
// selected row's highlight slides (shared layout). Reduced motion: values
// change at once.
import { animate, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { DonutChart } from "@/components/ui/DonutChart";
import { controlClasses } from "@/components/ui/Field";
import { formatRupiah } from "@/lib/api";
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_COLORS, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

const noop = () => () => {};
const isClient = () => true;
const isServer = () => false;

const PRESETS = [50_000_000, 100_000_000, 250_000_000, 500_000_000];
const COLORS = BUDGET_CATEGORIES.map((c) => BUDGET_CATEGORY_COLORS[c.key]);

function juta(n: number): string {
  return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
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

export function BudgetDemo() {
  const reduced = useReducedMotion();
  const [total, setTotal] = useState(100_000_000);
  const [categories, setCategories] = useState(defaultCategoryState());
  const [selected, setSelected] = useState<BudgetCategoryKey>("decor");
  const mounted = useSyncExternalStore(noop, isClient, isServer);

  const sel = categories.find((c) => c.category === selected)!;
  const selMeta = BUDGET_CATEGORIES.find((c) => c.key === selected)!;
  const selAmount = Math.round((total * sel.percentage) / 100);

  return (
    <section id="budget-demo" aria-labelledby="budget-judul" className="scroll-mt-16 bg-dc-ivory pb-20 sm:pb-28">
      {/* Photo band: the reception the money is for. */}
      <div className="dc-on-dark relative isolate overflow-hidden bg-dc-ink pb-48 pt-20 text-center text-dc-on-dark sm:pb-56 sm:pt-28">
        <Image src="/photos/momen/resepsi-mandar-1400.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-[50%_40%]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-dc-ink/75" />
        <Reveal className="dc-container">
          <p className="dc-eyebrow justify-center">Budget planner</p>
          <h2 id="budget-judul" className="mx-auto mt-4 max-w-3xl font-heading text-[clamp(2.5rem,5.6vw,4.8rem)] leading-[1] text-[#fbf6ec]">
            Coba bagi anggaranmu, <span className="dc-em-light">sekarang.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-[#fbf6ec]/90">Ketuk kategori, geser porsinya. Total tetap 100%.</p>
        </Reveal>
      </div>

      <div className="dc-container -mt-36 sm:-mt-44">
        <Reveal className="relative mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-dc-line bg-dc-white shadow-lift">
            {/* Total */}
            <div className="flex flex-col gap-4 border-b border-dc-line p-5 sm:p-7 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-dc-text-2">Total anggaran</p>
                <p className="mt-1 font-heading text-[clamp(2.6rem,6vw,3.8rem)] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                  <Counting value={total} format={juta} />
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan total anggaran">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={total === p}
                      onClick={() => setTotal(p)}
                      className={`min-h-11 rounded-full border px-4 text-sm font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-300 active:scale-95 ${
                        total === p ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-text-2 hover:border-dc-ink hover:text-dc-ink"
                      }`}
                    >
                      {p / 1_000_000} jt
                    </button>
                  ))}
                </div>
                <label htmlFor="demo-total" className="sr-only">
                  Total anggaran dalam rupiah
                </label>
                <input
                  id="demo-total"
                  type="text"
                  inputMode="numeric"
                  value={total > 0 ? total.toLocaleString("id-ID") : ""}
                  placeholder="Atau ketik sendiri"
                  onChange={(e) => setTotal(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  className={`${controlClasses} tabular-nums`}
                />
              </div>
            </div>

            <div className="grid gap-8 p-5 sm:p-7 md:grid-cols-[auto_1fr] md:items-center">
              {/* Donut with the selected category in the middle */}
              <div className="relative mx-auto h-[220px] w-[220px]">
                {/* Client-only: the shared DonutChart's first paint depends on reduced
                    motion, which the server cannot know (hydration mismatch). */}
                {mounted ? (
                  <DonutChart segments={categories.map((c) => ({ label: BUDGET_CATEGORIES.find((m) => m.key === c.category)!.label, value: c.percentage }))} size={220} colors={COLORS} />
                ) : (
                  <span aria-hidden className="block h-[220px] w-[220px] rounded-full border-[16px] border-dc-cream" />
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
                  <span className="text-xs font-semibold text-dc-text-3">{selMeta.label}</span>
                  <span className="font-heading text-4xl font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums]">{Math.round(sel.percentage)}%</span>
                  <span className="mt-1 text-sm font-bold tabular-nums text-dc-ink">
                    <Counting value={selAmount} format={juta} />
                  </span>
                </div>
              </div>

              {/* Categories */}
              <div>
                <ul className="flex flex-col">
                  {BUDGET_CATEGORIES.map((meta) => {
                    const st = categories.find((c) => c.category === meta.key)!;
                    const on = meta.key === selected;
                    return (
                      <li key={meta.key}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSelected(meta.key)}
                          className="relative grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-left"
                        >
                          {on && <motion.span layoutId={reduced ? undefined : "budget-row"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-0 rounded-lg bg-dc-cream" />}
                          <span className="relative flex items-center gap-2 text-sm font-semibold text-dc-ink">
                            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: BUDGET_CATEGORY_COLORS[meta.key] }} />
                            {meta.label}
                          </span>
                          <span className="relative text-sm tabular-nums text-dc-text-2">
                            {Math.round(st.percentage)}% <span className="font-semibold text-dc-ink">{juta((total * st.percentage) / 100)}</span>
                          </span>
                          <span aria-hidden className="relative col-span-2 h-1 overflow-hidden rounded-full bg-dc-paper-3/60">
                            <span
                              className="block h-full w-full origin-left rounded-full transition-transform duration-500 ease-dc motion-reduce:transition-none"
                              style={{ backgroundColor: BUDGET_CATEGORY_COLORS[meta.key], transform: `scaleX(${st.percentage / 100})` }}
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* The one slider: the selected category */}
            <div className="border-t border-dc-line bg-dc-ivory/60 p-5 sm:p-7">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor="demo-slider" className="text-sm font-semibold text-dc-ink">
                  Geser porsi {selMeta.label}
                </label>
                <span className="text-sm font-bold tabular-nums text-dc-ink">{formatRupiah(selAmount)}</span>
              </div>
              <input
                id="demo-slider"
                type="range"
                min={0}
                max={100}
                value={sel.percentage}
                onChange={(e) => setCategories((prev) => rescale(prev, selected, Number(e.target.value)))}
                aria-valuetext={`${Math.round(sel.percentage)} persen, ${formatRupiah(selAmount)}`}
                className="dc-slider"
                style={{ "--progress": `${sel.percentage}%` } as CSSProperties}
              />
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
