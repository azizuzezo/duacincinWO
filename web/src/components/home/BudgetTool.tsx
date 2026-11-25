"use client";

// "Hitung budget": a live budget split, marketplace "wedding tools" style.
// Same categories, default shares and rescale rule as the real Budget
// Planner in the couple's account (lib/budget.ts, PRD §8.8): moving one
// slider rescales the others so the total stays 100%. Each row shows the
// rupiah amount and links to that category's vendors. Nothing is saved here;
// "Simpan di akunmu" leads to sign-up, where the real planner lives.
import { motion } from "framer-motion";
import Link from "next/link";
import { useId, useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { BUDGET_CATEGORIES, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";
import { EASE, useReducedMotion } from "@/lib/motion";

import { SectionHead, wdButton } from "./ui";

// Gold-and-neutral series: distinct in lightness, each labelled in text too.
const COLORS: Record<BudgetCategoryKey, string> = {
  venue_catering: "#85662b",
  decor: "#c9a45c",
  photo_video: "#4b4542",
  mua_attire: "#e2c992",
  entertainment: "#8a7f76",
  invitation_souvenir: "#b99a74",
  reserve: "#d8cfc6",
};

const PRESETS = [50, 100, 200, 350];
const MIN = 20;
const MAX = 1000;
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function BudgetTool() {
  const reduced = useReducedMotion();
  const id = useId();
  const [total, setTotal] = useState(150); // juta
  const [split, setSplit] = useState(defaultCategoryState);

  const amount = (pct: number) => rupiah.format(Math.round((total * 1_000_000 * pct) / 100 / 100_000) * 100_000);

  return (
    <section id="budget" aria-labelledby="budget-judul" className="scroll-mt-36 bg-white py-14 sm:py-20">
      <div className="wd-container">
        <Reveal>
          <SectionHead
            id="budget-judul"
            title={
              <>
                Hitung budget pernikahanmu <em>dalam semenit</em>
              </>
            }
            sub="Pembagian awalnya sama dengan budget planner di akunmu. Geser untuk menyesuaikan."
          />
        </Reveal>

        <Reveal className="mt-8">
          <div className="grid gap-8 rounded-[28px] border border-wd-line bg-wd-paper p-5 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:p-10">
            {/* Total */}
            <div>
              <label htmlFor={`${id}-total`} className="text-sm font-semibold text-wd-ink">
                Total budget
              </label>
              <p className="mt-2 text-[clamp(2rem,4vw,2.8rem)] font-semibold leading-none tracking-tight text-wd-ink tabular-nums" aria-live="polite">
                {rupiah.format(total * 1_000_000)}
              </p>
              <input
                id={`${id}-total`}
                type="range"
                min={MIN}
                max={MAX}
                step={5}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
                aria-valuetext={`${total} juta rupiah`}
                className="mt-5 h-11 w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-xs text-wd-muted">
                <span>Rp20 juta</span>
                <span>Rp1 miliar</span>
              </div>
              <div role="group" aria-label="Pilih cepat" className="mt-5 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={total === p}
                    onClick={() => setTotal(p)}
                    className="inline-flex min-h-10 items-center rounded-full border border-wd-accent-line bg-white px-4 text-sm font-medium text-wd-accent-ink transition-colors hover:bg-wd-accent-wash aria-pressed:border-wd-accent aria-pressed:bg-wd-accent aria-pressed:text-wd-ink"
                  >
                    {p} juta
                  </button>
                ))}
              </div>

              {/* Stacked bar: the whole split at a glance. */}
              <div aria-hidden className="mt-8 flex h-4 overflow-hidden rounded-full bg-wd-blush">
                {split.map((c) => (
                  <motion.span
                    key={c.category}
                    className="block h-full"
                    style={{ background: COLORS[c.category] }}
                    animate={{ width: `${c.percentage}%` }}
                    transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                  />
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register?role=client" className={wdButton()}>
                  Simpan di akunmu
                </Link>
                <button type="button" onClick={() => setSplit(defaultCategoryState())} className={wdButton({ variant: "outline" })}>
                  Atur ulang
                </button>
              </div>
            </div>

            {/* Per category */}
            <ul className="flex flex-col gap-1">
              {split.map((c) => {
                const meta = BUDGET_CATEGORIES.find((b) => b.key === c.category)!;
                const target = meta.vendorCategories?.[0];
                const sid = `${id}-${c.category}`;
                return (
                  <li key={c.category} className="rounded-2xl px-3 py-2.5 transition-colors hover:bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor={sid} className="flex items-center gap-2.5 text-[0.95rem] font-medium text-wd-ink">
                        <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[c.category] }} />
                        {meta.label}
                      </label>
                      <span className="text-right text-sm tabular-nums">
                        <span className="font-semibold text-wd-ink">{amount(c.percentage)}</span>
                        <span className="ml-2 text-wd-muted">{Math.round(c.percentage)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <input
                        id={sid}
                        type="range"
                        min={0}
                        max={70}
                        step={1}
                        value={Math.round(c.percentage)}
                        onChange={(e) => setSplit((s) => rescale(s, c.category, Number(e.target.value)))}
                        aria-valuetext={`${Math.round(c.percentage)} persen, ${amount(c.percentage)}`}
                        className="h-8 flex-1 cursor-pointer"
                      />
                      {target && c.category !== "reserve" && (
                        <Link href={`/kategori/${target}`} className="-my-2 inline-flex min-h-11 shrink-0 items-center px-1 text-xs font-semibold text-wd-accent-ink underline-offset-4 hover:underline">
                          Cari vendor
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
