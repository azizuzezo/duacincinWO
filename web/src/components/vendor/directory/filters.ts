import type { DirectoryCard } from "@/lib/api";

export type Sort = "default" | "rating" | "price_asc" | "price_desc";

export const SORTS: { value: Sort; label: string }[] = [
  { value: "default", label: "Urutan awal" },
  { value: "rating", label: "Rating tertinggi" },
  { value: "price_asc", label: "Harga termurah" },
  { value: "price_desc", label: "Harga termahal" },
];

/** Budget buckets on the vendor's own "mulai dari" price (price_min). A vendor
 * without a listed price cannot be placed in a bucket, so it drops out while a
 * budget is chosen (the UI says so). Filtering happens in the browser on the
 * list the directory already loaded; the API call is unchanged. */
export const BUDGETS: { value: string; label: string; short: string; min: number; max: number }[] = [
  { value: "", label: "Semua budget", short: "Semua budget", min: 0, max: Infinity },
  { value: "lt5", label: "Sampai Rp 5 juta", short: "Sampai Rp 5 juta", min: 1, max: 5_000_000 },
  { value: "5-15", label: "Rp 5 juta sampai 15 juta", short: "Rp 5 sampai 15 juta", min: 5_000_001, max: 15_000_000 },
  { value: "15-50", label: "Rp 15 juta sampai 50 juta", short: "Rp 15 sampai 50 juta", min: 15_000_001, max: 50_000_000 },
  { value: "gt50", label: "Di atas Rp 50 juta", short: "Di atas Rp 50 juta", min: 50_000_001, max: Infinity },
];

export type Filters = { query: string; city: string; budget: string; sort: Sort };

export const EMPTY_FILTERS: Filters = { query: "", city: "", budget: "", sort: "default" };

export function applyFilters(cards: DirectoryCard[], f: Filters): DirectoryCard[] {
  const q = f.query.trim().toLowerCase();
  const bucket = BUDGETS.find((b) => b.value === f.budget) ?? BUDGETS[0];
  let list = cards.filter(
    (c) =>
      (!f.city || c.city === f.city) &&
      (!q || `${c.business_name} ${c.city}`.toLowerCase().includes(q)) &&
      (!f.budget || (c.price_min >= bucket.min && c.price_min <= bucket.max)),
  );
  if (f.sort === "rating") list = [...list].sort((a, b) => b.average_rating - a.average_rating);
  // Unlisted prices (0) go last, not first, when sorting cheapest first.
  if (f.sort === "price_asc") list = [...list].sort((a, b) => (a.price_min || Number.MAX_SAFE_INTEGER) - (b.price_min || Number.MAX_SAFE_INTEGER));
  if (f.sort === "price_desc") list = [...list].sort((a, b) => b.price_min - a.price_min);
  return list;
}

export function budgetLabel(value: string): string {
  return BUDGETS.find((b) => b.value === value)?.label ?? "";
}
