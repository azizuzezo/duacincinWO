"use client";

import Link from "next/link";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { formatRupiah } from "@/lib/api";
import { BUDGET_CATEGORIES, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";

/** A real, working preview of the Budget Planner — visitors can drag
 * sliders and watch the same proportional-rescale logic used in the app
 * itself, no login required. Proof, not a screenshot. */
export function BudgetDemo() {
  const [totalBudget, setTotalBudget] = useState(100000000);
  const [categories, setCategories] = useState(defaultCategoryState());

  function handleChange(key: BudgetCategoryKey, value: number) {
    setCategories((prev) => rescale(prev, key, value));
  }

  return (
    <section id="budget-demo" className="mx-auto max-w-4xl px-4 py-20">
      <Reveal className="mx-auto max-w-xl text-center">
        <h2 className="font-heading text-3xl font-extrabold text-dc-navy">Coba Budget Planner-nya Langsung</h2>
        <p className="mt-3 text-dc-black/60">Geser slider-nya — kategori lain otomatis menyesuaikan supaya total tetap 100%.</p>
      </Reveal>

      <Reveal delay={150} className="mt-10 rounded-3xl border border-dc-black/5 bg-dc-white p-6 shadow-xl shadow-dc-navy/5 sm:p-8">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="demo-total" className="text-sm font-medium text-dc-navy">
            Total Budget (Rp)
          </label>
          <input
            id="demo-total"
            type="number"
            min={0}
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
            className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
          />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {BUDGET_CATEGORIES.map((meta) => {
            const state = categories.find((c) => c.category === meta.key)!;
            const amount = Math.round((totalBudget * state.percentage) / 100);
            return (
              <div key={meta.key}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-dc-navy">{meta.label}</span>
                  <span className="text-sm text-dc-black/60">
                    {state.percentage.toFixed(1)}% · {formatRupiah(amount)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={state.percentage}
                  onChange={(e) => handleChange(meta.key, Number(e.target.value))}
                  className="w-full accent-dc-gold"
                  aria-label={meta.label}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link href="/client/register" className="text-sm font-semibold text-dc-gold hover:text-dc-navy">
            Simpan budget-mu sungguhan — daftar gratis →
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
