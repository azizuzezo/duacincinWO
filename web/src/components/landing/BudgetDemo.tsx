"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { Reveal } from "@/components/landing/Reveal";
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
    <section id="budget-demo" className="scroll-mt-16 border-t border-dc-ink/10 bg-dc-cream">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
        <Reveal className="lg:col-span-4">
          <h2 className="font-heading text-4xl leading-[1.05] text-dc-ink sm:text-5xl">
            Coba bagi anggaranmu, <span className="dc-em">sekarang juga.</span>
          </h2>
          <p className="mt-5 leading-relaxed text-dc-ink/80">
            Geser satu kategori, kategori lain menyesuaikan secara proporsional sehingga total tetap 100%. Ini
            perhitungan yang sama dengan budget planner di dalam akun.
          </p>
          <Link
            href="/register?role=client"
            className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
          >
            Simpan budget ini di akun client
          </Link>
        </Reveal>

        <div className="rounded-lg border border-dc-ink/10 bg-dc-white p-5 sm:p-8 lg:col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label htmlFor="demo-total" className="mb-1.5 block text-sm font-medium text-dc-ink">
                Total budget (Rp)
              </label>
              <input
                id="demo-total"
                type="text"
                inputMode="numeric"
                value={totalBudget > 0 ? totalBudget.toLocaleString("id-ID") : ""}
                onChange={(e) => setTotalBudget(Number(e.target.value.replace(/\D/g, "")) || 0)}
                className="min-h-11 w-full rounded-md border border-dc-ink/25 bg-dc-white px-3 text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink sm:w-56"
              />
            </div>
            <p className="font-heading text-4xl text-dc-ink">Rp {(totalBudget / 1000000).toLocaleString("id-ID")} juta</p>
          </div>

          <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-sm bg-dc-cream" role="img" aria-label="Proporsi anggaran per kategori">
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
                    <span className="text-sm tabular-nums text-dc-ink/75">
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
