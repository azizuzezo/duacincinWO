import type { MetadataRoute } from "next";

import { ARTICLES } from "@/content/artikel/registry";
import { VENDOR_CATEGORIES, vendorCategoryList, vendorCities } from "@/lib/api";
import { cityFromSlug, citySlug, fetchAllVendors } from "@/lib/server-api";
import { SITE_URL as SITE } from "@/lib/site";

// Rebuilt at most once an hour, so new vendors reach search engines without a deploy.
export const revalidate = 3600;

// Static public routes, one landing URL per category, every article, and from
// the live directory: each vendor profile plus each category x city page that
// has at least one vendor (empty city pages are left out on purpose). If the
// API is down the static part is still served.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = ["", "/vendors", "/artikel", "/cara-kerja", "/untuk-vendor", "/bantuan", "/inspirasi", "/tentang-kami", "/legal/client-tos", "/legal/vendor-agreement"];
  const vendors = (await fetchAllVendors()) ?? [];
  const cityPages = new Set<string>();
  for (const v of vendors) {
    // Only cities whose slug reads back as the same name (the API matches
    // case-insensitively): "Toli-Toli" or an old free-text "Bandung, Sumedang"
    // would point at a page that finds no vendor.
    const cities = vendorCities(v).filter((city) => cityFromSlug(citySlug(city)).toLowerCase() === city.trim().toLowerCase());
    for (const c of vendorCategoryList(v)) for (const city of cities) cityPages.add(`/kategori/${c}/${citySlug(city)}`);
  }
  return [
    ...fixed.map((p) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...VENDOR_CATEGORIES.map((c) => ({ url: `${SITE}/kategori/${c.value}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...[...cityPages].sort().map((p) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...ARTICLES.map((a) => ({ url: `${SITE}/artikel/${a.slug}`, lastModified: new Date(a.updated ?? a.published), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...vendors.map((v) => ({ url: `${SITE}/vendors/${v.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
