"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { controlClasses } from "@/components/ui/Field";
import { formatRupiah } from "@/lib/api";
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_COLORS, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";

/** Working preview of the real Budget Planner: same proportional-rescale
 * logic as the app, no login required. */
export function BudgetDemo() {
  const [totalBudget, setTotalBudget] = useState(100000000);
  const [categories, setCategories] = useState(defaultCategoryState());

  function handleChange(key: BudgetCategoryKey, value: number) {
    setCategories((prev) => rescale(prev, key, value));
  }

  return (
    <section id="budget-demo" aria-labelledby="budget-judul" className="scroll-mt-16 bg-dc-white">
      <div className="dc-container grid gap-10 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16 lg:py-32">
        <Reveal className="lg:col-span-4">
          <p className="dc-eyebrow">Budget planner</p>
          <h2 id="budget-judul" className="mt-4 font-heading text-[clamp(2.3rem,4.2vw,3.6rem)] leading-[1.04] text-dc-ink">
            Coba bagi anggaranmu, <span className="dc-em">sekarang juga.</span>
          </h2>
          <p className="mt-5 leading-relaxed text-dc-text-2">
            Geser satu kategori, kategori lain menyesuaikan secara proporsional sehingga total tetap 100%. Ini
            perhitungan yang sama dengan budget planner di dalam akun.
          </p>
          <Link
            href="/register?role=client"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay"
          >
            Simpan budget ini di akun client
          </Link>
        </Reveal>

        <div className="rounded-2xl border border-dc-line bg-dc-ivory p-5 shadow-soft sm:p-8 lg:col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label htmlFor="demo-total" className="mb-1.5 block text-sm font-semibold text-dc-ink">
                Total budget (Rp)
              </label>
              <input
                id="demo-total"
                type="text"
                inputMode="numeric"
                value={totalBudget > 0 ? totalBudget.toLocaleString("id-ID") : ""}
                onChange={(e) => setTotalBudget(Number(e.target.value.replace(/\D/g, "")) || 0)}
                className={`${controlClasses} tabular-nums sm:w-56`}
              />
            </div>
            <p className="font-heading text-5xl font-semibold text-dc-ink [font-variant-numeric:lining-nums]">Rp {(totalBudget / 1000000).toLocaleString("id-ID")} juta</p>
          </div>

          <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-dc-cream" role="img" aria-label="Proporsi anggaran per kategori">
            {categories.map((c) => (
              <div
                key={c.category}
                style={{ width: `${c.percentage}%`, backgroundColor: BUDGET_CATEGORY_COLORS[c.category] }}
                className="h-full transition-[width] duration-300 motion-reduce:transition-none"
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {BUDGET_CATEGORIES.map((meta) => {
              const state = categories.find((c) => c.category === meta.key)!;
              const amount = Math.round((totalBudget * state.percentage) / 100);
              return (
                <div key={meta.key}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="flex items-center gap-2 text-sm font-medium text-dc-ink">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: BUDGET_CATEGORY_COLORS[meta.key] }} />
                      {meta.label}
                    </span>
                    <span className="text-sm tabular-nums text-dc-text-2">
                      {state.percentage.toFixed(1)}%: {formatRupiah(amount)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={state.percentage}
                    onChange={(e) => handleChange(meta.key, Number(e.target.value))}
                    className="dc-slider"
                    style={{ "--progress": `${state.percentage}%` } as CSSProperties}
                    aria-label={meta.label}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
