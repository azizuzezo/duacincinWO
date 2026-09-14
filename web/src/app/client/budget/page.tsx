"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/Button";
import { Card } from "@/components/ui/Card";
import { DonutChart } from "@/components/ui/DonutChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPut, ApiError, formatRupiah, type BudgetPlan, type CurrentUser, type SpentByCategory } from "@/lib/api";
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_COLORS,
  defaultCategoryState,
  rescale,
  spentForBudgetCategory,
  type BudgetCategoryKey,
} from "@/lib/budget";

export default function BudgetPlannerPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <BudgetPlannerContent user={user} />}
    </WithUser>
  );
}

type CategoryState = { category: BudgetCategoryKey; percentage: number };

function BudgetPlannerContent({ user }: { user: CurrentUser }) {
  const [totalBudget, setTotalBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [categories, setCategories] = useState<CategoryState[]>(defaultCategoryState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [spentByCategory, setSpentByCategory] = useState<SpentByCategory>({});

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
    apiGet<SpentByCategory>("/api/v1/bookings/spent-by-category")
      .then((d) => setSpentByCategory(d ?? {}))
      .catch(() => {});
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

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title="Budget Planner"
          subtitle="Isi total budget, lalu geser tiap kategori. Kategori lain otomatis menyesuaikan supaya total tetap 100%."
        />

        {loading ? (
          <p className="text-dc-black/60">Memuat…</p>
        ) : (
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="total-budget" className="text-sm font-medium text-dc-navy">
                    Total Budget (Rp)
                  </label>
                  <input
                    id="total-budget"
                    type="text"
                    inputMode="numeric"
                    value={totalBudget ? Number(totalBudget).toLocaleString("id-ID") : ""}
                    onChange={(e) => setTotalBudget(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                  />
                  <p className="text-xs text-dc-black/50">{total > 0 ? formatRupiah(total) : " "}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="guest-count" className="text-sm font-medium text-dc-navy">
                    Jumlah Tamu
                  </label>
                  <input
                    id="guest-count"
                    type="text"
                    inputMode="numeric"
                    value={guestCount ? Number(guestCount).toLocaleString("id-ID") : ""}
                    onChange={(e) => setGuestCount(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                  />
                  <p className="text-xs text-dc-black/50">
                    {total > 0 && Number(guestCount) > 0 ? `${formatRupiah(Math.round(total / Number(guestCount)))} / tamu` : " "}
                  </p>
                </div>
              </div>

              {/* Visual summary of the split */}
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <DonutChart
                  segments={categories.map((c) => ({ label: c.category, value: (total * c.percentage) / 100 }))}
                  colors={categories.map((c) => BUDGET_CATEGORY_COLORS[c.category])}
                />
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-dc-offwhite">
                {categories.map((c) => (
                  <div
                    key={c.category}
                    style={{ width: `${c.percentage}%`, backgroundColor: BUDGET_CATEGORY_COLORS[c.category] }}
                    className="h-full transition-all duration-300"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-5">
                {BUDGET_CATEGORIES.map((meta) => {
                  const state = categories.find((c) => c.category === meta.key)!;
                  const amount = Math.round((total * state.percentage) / 100);
                  const spent = spentForBudgetCategory(spentByCategory, meta.key);
                  const spentPct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0;
                  return (
                    <div key={meta.key}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <label htmlFor={`slider-${meta.key}`} className="flex items-center gap-2 font-medium text-dc-navy">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BUDGET_CATEGORY_COLORS[meta.key] }} />
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
                      {spent > 0 && (
                        <div className="mt-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-dc-offwhite">
                            <div
                              className="h-full rounded-full bg-dc-navy transition-all duration-300"
                              style={{ width: `${spentPct}%` }}
                            />
                          </div>
                          <p className="mt-0.5 text-xs text-dc-black/50">
                            Sudah booking {formatRupiah(spent)} dari alokasi {formatRupiah(amount)}
                          </p>
                        </div>
                      )}
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
          </Card>
        )}
      </div>
    </Shell>
  );
}
