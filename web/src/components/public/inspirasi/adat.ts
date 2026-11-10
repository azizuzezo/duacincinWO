import { VENDOR_CATEGORIES, type InspirationItem } from "@/lib/api";

// Adat is not a field in the data: it is read from the curator's caption and
// alt text. A chip only appears when at least one photo matches, so a filter
// never leads to an empty page.
export type Adat = { key: string; label: string; photo?: string; test: RegExp };

export const ADAT: Adat[] = [
  { key: "jawa", label: "Jawa", photo: "/hero/adat/jawa.webp", test: /\b(jawa|javanese|solo|yogya|jogja|paes)\b/ },
  { key: "sunda", label: "Sunda", photo: "/hero/adat/sunda.webp", test: /\b(sunda|sundanese|siger)\b/ },
  { key: "minang", label: "Minang", photo: "/hero/adat/minang.webp", test: /\b(minang|minangkabau|padang|suntiang)\b/ },
  { key: "bugis", label: "Bugis", photo: "/hero/adat/bugis.webp", test: /\b(bugis|makassar)\b/ },
  { key: "batak", label: "Batak", test: /\b(batak|ulos)\b/ },
  { key: "bali", label: "Bali", test: /\b(bali|balinese)\b/ },
  { key: "dayak", label: "Dayak", photo: "/hero/adat/dayak.webp", test: /\bdayak\b/ },
  { key: "melayu", label: "Melayu", photo: "/hero/adat/melayu.webp", test: /\b(melayu|malay)\b/ },
  { key: "betawi", label: "Betawi", test: /\bbetawi\b/ },
  { key: "internasional", label: "Internasional", photo: "/hero/adat/barat.webp", test: /\b(barat|internasional|international|western)\b/ },
];

/** Lower-cased caption + alt, with regional names that contain "barat"
 * rewritten first so "Jawa Barat" counts as Sunda, not Internasional. */
function haystack(item: InspirationItem): string {
  return `${item.caption} ${item.alt_text}`
    .toLowerCase()
    .replace(/jawa barat/g, "sunda")
    .replace(/sumatera barat|sumatra barat/g, "minang")
    .replace(/(kalimantan|nusa tenggara|sulawesi|papua) barat/g, "");
}

export function adatOf(item: InspirationItem): string[] {
  const h = haystack(item);
  return ADAT.filter((a) => a.test.test(h)).map((a) => a.key);
}

export function matchesQuery(item: InspirationItem, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return `${item.caption} ${item.alt_text}`.toLowerCase().includes(needle) || adatOf(item).includes(needle);
}

/** Categories that are real vendor categories (the Pinterest sync stores
 * "Pinterest" as its category, which is not something a couple filters by). */
export function vendorCategory(value: string) {
  return VENDOR_CATEGORIES.find((c) => c.value === value);
}
