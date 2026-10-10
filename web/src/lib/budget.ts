// Budget Planner category metadata & rescale logic (PRD §8.8).

export type BudgetCategoryKey =
  | "venue_catering"
  | "decor"
  | "photo_video"
  | "mua_attire"
  | "entertainment"
  | "invitation_souvenir"
  | "reserve";

export const BUDGET_CATEGORIES: {
  key: BudgetCategoryKey;
  label: string;
  defaultPercentage: number;
  vendorCategories?: string[];
}[] = [
  { key: "venue_catering", label: "Venue & Catering", defaultPercentage: 40, vendorCategories: ["venue", "catering"] },
  { key: "decor", label: "Dekorasi", defaultPercentage: 15, vendorCategories: ["decor"] },
  { key: "photo_video", label: "Foto & Video", defaultPercentage: 12, vendorCategories: ["photo_video"] },
  { key: "mua_attire", label: "MUA & Attire", defaultPercentage: 10, vendorCategories: ["mua_attire"] },
  { key: "entertainment", label: "Entertainment", defaultPercentage: 8, vendorCategories: ["entertainment"] },
  { key: "invitation_souvenir", label: "Undangan & Souvenir", defaultPercentage: 5, vendorCategories: ["invitation_souvenir"] },
  { key: "reserve", label: "Cadangan", defaultPercentage: 10 },
];

// Shared with the real Budget Planner (app/client/budget) and the landing
// page's live demo, so both visualize categories with the same colors.
export const BUDGET_CATEGORY_COLORS: Record<BudgetCategoryKey, string> = {
  venue_catering: "#1b1713",
  decor: "#b8862f",
  photo_video: "#8e4028",
  mua_attire: "#6e4f17",
  entertainment: "#5c6b7a",
  invitation_souvenir: "#9b8377",
  reserve: "#7c8a6e",
};

export function defaultCategoryState(): { category: BudgetCategoryKey; percentage: number }[] {
  return BUDGET_CATEGORIES.map((c) => ({ category: c.key, percentage: c.defaultPercentage }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Adjusting one category's percentage rescales every other category
 * proportionally (relative to their current share of the remainder) so the
 * total always stays exactly 100% — the "interactive pie chart" behavior
 * from PRD §8.8.
 */
export function rescale(
  categories: { category: BudgetCategoryKey; percentage: number }[],
  changedKey: BudgetCategoryKey,
  newPercentageRaw: number,
): { category: BudgetCategoryKey; percentage: number }[] {
  const newPercentage = Math.min(100, Math.max(0, newPercentageRaw));
  const others = categories.filter((c) => c.category !== changedKey);
  const oldOthersSum = others.reduce((s, c) => s + c.percentage, 0);
  const remaining = 100 - newPercentage;

  const rescaledOthers = others.map((c) => {
    const share = oldOthersSum > 0 ? c.percentage / oldOthersSum : 1 / others.length;
    return { category: c.category, percentage: round1(share * remaining) };
  });

  const result = categories.map((c) =>
    c.category === changedKey
      ? { category: c.category, percentage: round1(newPercentage) }
      : rescaledOthers.find((r) => r.category === c.category)!,
  );

  // Rounding to 1 decimal can leave the total a hair off 100 — push the
  // remainder onto the largest *other* category so the number the user
  // just set stays exactly what they dragged to.
  const total = result.reduce((s, c) => s + c.percentage, 0);
  const diff = round1(100 - total);
  if (diff !== 0 && others.length > 0) {
    const largest = result.filter((c) => c.category !== changedKey).reduce((a, b) => (b.percentage > a.percentage ? b : a));
    largest.percentage = round1(largest.percentage + diff);
  }

  return result;
}

export function categoryLabelFor(key: string): string {
  return BUDGET_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** Sums a "spent by vendor category" map (from GET /bookings/spent-by-category)
 * into one budget-plan category, e.g. venue_catering combines the vendor
 * categories "venue" and "catering". Categories with no vendorCategories
 * (like "reserve") have nothing to sum, so they're always 0. */
export function spentForBudgetCategory(spentByVendorCategory: Record<string, number>, key: BudgetCategoryKey): number {
  const meta = BUDGET_CATEGORIES.find((c) => c.key === key);
  if (!meta?.vendorCategories) return 0;
  return meta.vendorCategories.reduce((sum, vc) => sum + (spentByVendorCategory[vc] ?? 0), 0);
}
