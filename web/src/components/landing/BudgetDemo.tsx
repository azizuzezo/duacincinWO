"use client";

import Link from "next/link";
import { useState } from "react";

import { ParallaxImage } from "@/components/landing/ParallaxImage";
import { formatRupiah } from "@/lib/api";
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_COLORS, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";

/** A real, working preview of the Budget Planner. Visitors can drag
 * sliders and watch the same proportional-rescale logic used in the app
 * itself, no login required. Proof, not a screenshot. */
export function BudgetDemo() {
  const [totalBudget, setTotalBudget] = useState(100000000);
  const [categories, setCategories] = useState(defaultCategoryState());

  function handleChange(key: BudgetCategoryKey, value: number) {
    setCategories((prev) => rescale(prev, key, value));
  }

  return (
    <section id="budget-demo" className="scroll-mt-20 bg-dc-offwhite py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-dc-navy">Coba Budget Planner-nya Langsung</h2>
          <p className="mt-3 text-dc-black/60">Geser slider-nya, kategori lain otomatis menyesuaikan supaya total tetap 100%.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative hidden overflow-hidden rounded-2xl bg-dc-navy p-8 text-dc-white shadow-md shadow-dc-navy/10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="font-heading text-2xl font-bold">Rp {(totalBudget / 1000000).toLocaleString("id-ID")} Juta</p>
              <p className="mt-2 text-sm text-dc-white/70">
                Terbagi otomatis ke {BUDGET_CATEGORIES.length} kategori, tinggal geser kalau mau ubah porsinya sendiri.
              </p>
            </div>
            <ParallaxImage
              src="/hero/adat/minang.webp"
              alt="Pasangan pengantin adat Minang"
              className="-bottom-8 -right-6 h-52 w-40"
              speed={18}
              rotate={-3}
            />
          </div>

          <div className="rounded-2xl bg-dc-white p-6 shadow-xl shadow-dc-navy/10 sm:p-8">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="demo-total" className="text-sm font-medium text-dc-navy">
                Total Budget (Rp)
              </label>
              <input
                id="demo-total"
                type="text"
                inputMode="numeric"
                value={totalBudget > 0 ? totalBudget.toLocaleString("id-ID") : ""}
                onChange={(e) => setTotalBudget(Number(e.target.value.replace(/\D/g, "")) || 0)}
                className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
            </div>

            <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-dc-offwhite">
              {categories.map((c) => (
                <div
                  key={c.category}
                  style={{ width: `${c.percentage}%`, backgroundColor: BUDGET_CATEGORY_COLORS[c.category] }}
                  className="h-full transition-all duration-300"
                />
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {BUDGET_CATEGORIES.map((meta) => {
                const state = categories.find((c) => c.category === meta.key)!;
                const amount = Math.round((totalBudget * state.percentage) / 100);
                return (
                  <div key={meta.key}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-dc-navy">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: BUDGET_CATEGORY_COLORS[meta.key] }}
                        />
                        {meta.label}
                      </span>
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
              <Link href="/register?role=client" className="text-sm font-semibold text-dc-gold hover:text-dc-navy">
                Simpan budget-mu sungguhan, daftar gratis →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
