import type { MetadataRoute } from "next";

import { VENDOR_CATEGORIES } from "@/lib/api";
import { SITE_URL as SITE } from "@/lib/site";

// Static public routes plus one landing URL per category. Category x city
// pages and vendor detail pages join once the API exposes a public listing
// usable at build time.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const fixed = ["", "/vendors", "/cara-kerja", "/untuk-vendor", "/bantuan", "/inspirasi", "/legal/client-tos", "/legal/vendor-agreement", "/perusahaan"];
  return [
    ...fixed.map((p) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...VENDOR_CATEGORIES.map((c) => ({
      url: `${SITE}/kategori/${c.value}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
