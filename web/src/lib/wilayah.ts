// Indonesia's 38 provinces and 514 kabupaten/kota (Kepmendagri No
// 300.2.2-2138 Tahun 2025). Same file as server/internal/wilayah/wilayah.json,
// which validates the vendor's city on save; keep the two identical.
import data from "./wilayah.json";

export type Region = { city: string; province: string };

/** Every kabupaten/kota with its province, A to Z by city. */
export const REGIONS: Region[] = (data as { name: string; cities: string[] }[])
  .flatMap((p) => p.cities.map((city) => ({ city, province: p.name })))
  .sort((a, b) => a.city.localeCompare(b.city, "id"));

const byLower = new Map(REGIONS.map((r) => [r.city.toLowerCase(), r]));

/** The list's entry for a name (case-insensitive), or undefined when it was typed free. */
export function findRegion(name: string): Region | undefined {
  return byLower.get(name.trim().toLowerCase());
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
