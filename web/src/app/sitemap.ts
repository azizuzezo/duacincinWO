import type { MetadataRoute } from "next";

import { VENDOR_CATEGORIES } from "@/lib/api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Static public routes plus one directory URL per category. Vendor detail
// pages join this list once the API exposes a public id listing suitable for
// build-time use (Fase B).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const fixed = ["", "/vendors", "/inspirasi", "/legal/client-tos", "/legal/vendor-agreement"];
  return [
    ...fixed.map((p) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...VENDOR_CATEGORIES.map((c) => ({
      url: `${SITE}/vendors?category=${c.value}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
