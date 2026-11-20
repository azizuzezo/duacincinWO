// Indonesia's 38 provinces and 514 kabupaten/kota (Kepmendagri No
// 300.2.2-2138 Tahun 2025). Same file as server/internal/wilayah/wilayah.json,
// which validates the vendor's city on save; keep the two identical.
import data from "./wilayah.json";

export type Region = { city: string; province: string };

/** The single service-area entry for all of Greater Jakarta (server:
 * wilayah.JabodetabekArea). A vendor picks it once; a search for any of its
 * cities finds that vendor, and a search for it finds vendors in any of them. */
export const JABODETABEK_AREA = "Jabodetabek";

/** The cities "Jabodetabek" covers. Same list as server/internal/wilayah
 * Jabodetabek (Kepulauan Seribu left out). */
export const JABODETABEK = [
  "Jakarta Barat",
  "Jakarta Pusat",
  "Jakarta Selatan",
  "Jakarta Timur",
  "Jakarta Utara",
  "Bogor",
  "Kab. Bogor",
  "Depok",
  "Tangerang",
  "Kab. Tangerang",
  "Tangerang Selatan",
  "Bekasi",
  "Kab. Bekasi",
];

/** Whether a vendor listing `cities` serves `city` (same rule as the
 * server's wilayah.MatchNames): a Jabodetabek city is served by a
 * "Jabodetabek" vendor, and "Jabodetabek" by a vendor in any of its cities. */
export function servesCity(cities: string[], city: string): boolean {
  const want = city.trim().toLowerCase();
  if (!want) return true;
  const have = cities.map((c) => c.trim().toLowerCase());
  if (have.includes(want)) return true;
  const area = JABODETABEK_AREA.toLowerCase();
  const inArea = JABODETABEK.map((c) => c.toLowerCase());
  if (want === area || want === "jabotabek") return have.includes(area) || have.some((c) => inArea.includes(c));
  return inArea.includes(want) && have.includes(area);
}

/** Most kabupaten/kota one vendor can list (server: wilayah.MaxCities). */
export const MAX_CITIES = 20;

/** "Jabodetabek" first, then every kabupaten/kota with its province, A to Z by city. */
export const REGIONS: Region[] = [
  { city: JABODETABEK_AREA, province: "Jakarta, Bogor, Depok, Tangerang, Bekasi" },
  ...(data as { name: string; cities: string[] }[])
    .flatMap((p) => p.cities.map((city) => ({ city: city.trim(), province: p.name.trim() })))
    .sort((a, b) => a.city.localeCompare(b.city, "id")),
];

const byLower = new Map(REGIONS.map((r) => [r.city.toLowerCase(), r]));

/** The list's entry for a name (case-insensitive), or undefined when it was typed free. */
export function findRegion(name: string): Region | undefined {
  const k = name.trim().toLowerCase();
  if (k === "jabotabek") return byLower.get("jabodetabek");
  return byLower.get(k);
}

const fold = (s: string) => s.toLowerCase().replace(/^kab\.\s*/, "").trim();

/**
 * Matches for a search: city names starting with the query first, then
 * cities containing it, then every city of a matching province
 * ("jawa barat" lists Jawa Barat).
 */
export function searchRegions(query: string, limit = 60): Region[] {
  const q = query.trim().toLowerCase();
  if (!q) return REGIONS.slice(0, limit);
  const qf = fold(q);
  const starts: Region[] = [];
  const contains: Region[] = [];
  const inProvince: Region[] = [];
  for (const r of REGIONS) {
    const c = r.city.toLowerCase();
    if (c.startsWith(q) || fold(c).startsWith(qf)) starts.push(r);
    else if (c.includes(q)) contains.push(r);
    else if (r.province.toLowerCase().includes(q)) inProvince.push(r);
  }
  return [...starts, ...contains, ...inProvince].slice(0, limit);
}

/**
 * Choices for a city filter: "all", then cities that already have vendors
 * (when known), then every other kabupaten/kota. The province rides along as
 * the description, so searching "jawa barat" finds its cities.
 */
export function cityOptions(withVendors: string[] = [], allLabel = "Semua kota"): { value: string; label: string; description?: string }[] {
  const listed = new Set(withVendors);
  const head = withVendors
    .slice()
    .sort((a, b) => a.localeCompare(b, "id"))
    .map((c) => ({ value: c, label: c, description: findRegion(c) ? `Ada vendor · ${findRegion(c)!.province}` : "Ada vendor" }));
  const rest = REGIONS.filter((r) => !listed.has(r.city)).map((r) => ({ value: r.city, label: r.city, description: r.province }));
  return [{ value: "", label: allLabel }, ...head, ...rest];
}
