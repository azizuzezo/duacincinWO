"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPut, ApiError, formatRupiah, type BudgetPlan } from "@/lib/api";
import { BUDGET_CATEGORIES, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";

export default function BudgetPlannerPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {() => <BudgetPlannerContent />}
    </WithUser>
  );
}

type CategoryState = { category: BudgetCategoryKey; percentage: number };

function BudgetPlannerContent() {
  const [totalBudget, setTotalBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [categories, setCategories] = useState<CategoryState[]>(defaultCategoryState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function applyPlan(plan: BudgetPlan) {
    setTotalBudget(plan.total_budget ? String(plan.total_budget) : "");
    setGuestCount(plan.guest_count ? String(plan.guest_count) : "");
    setCategories(
      BUDGET_CATEGORIES.map((meta) => {
        const found = plan.categories.find((c) => c.category === meta.key);
        return { category: meta.key, percentage: found?.percentage ?? meta.defaultPercentage };
      }),
    );
  }

  useEffect(() => {
    apiGet<BudgetPlan>("/api/v1/budget-plan/me")
      .then(applyPlan)
      .catch(() => {
        /* pakai default */
      })
      .finally(() => setLoading(false));
  }, []);

  const total = Number(totalBudget) || 0;

  function handleSliderChange(key: BudgetCategoryKey, value: number) {
    setCategories((prev) => rescale(prev, key, value));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const plan = await apiPut<BudgetPlan>("/api/v1/budget-plan", {
        total_budget: total,
        guest_count: Number(guestCount) || 0,
        categories,
      });
      applyPlan(plan);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan budget plan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-8 text-center text-dc-black/60">Memuat…</p>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Budget Planner</h1>
      <p className="mt-1 text-dc-black/60">
        Isi total budget, lalu geser tiap kategori — kategori lain otomatis menyesuaikan supaya total tetap 100%.
      </p>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="total-budget" className="text-sm font-medium text-dc-navy">
              Total Budget (Rp)
            </label>
            <input
              id="total-budget"
              type="number"
              min={0}
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="guest-count" className="text-sm font-medium text-dc-navy">
              Jumlah Tamu
            </label>
            <input
              id="guest-count"
              type="number"
              min={0}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
            />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {BUDGET_CATEGORIES.map((meta) => {
            const state = categories.find((c) => c.category === meta.key)!;
            const amount = Math.round((total * state.percentage) / 100);
            return (
              <div key={meta.key}>
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor={`slider-${meta.key}`} className="font-medium text-dc-navy">
                    {meta.label}
                  </label>
                  <span className="text-sm text-dc-black/60">
                    {state.percentage.toFixed(1)}% · {formatRupiah(amount)}
                  </span>
                </div>
                <input
                  id={`slider-${meta.key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={state.percentage}
                  onChange={(e) => handleSliderChange(meta.key, Number(e.target.value))}
                  className="w-full accent-dc-gold"
                />
                {meta.vendorCategories && total > 0 && (
                  <div className="mt-1 flex gap-3 text-xs">
                    {meta.vendorCategories.map((vc) => (
                      <Link
                        key={vc}
                        href={`/vendors?category=${vc}&max_price=${amount}`}
                        className="font-semibold text-dc-gold hover:text-dc-navy"
                      >
                        Cari Vendor →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">Budget plan tersimpan.</p>}
        <Button type="submit" loading={saving}>
          Simpan
        </Button>
      </form>
    </main>
  );
}
