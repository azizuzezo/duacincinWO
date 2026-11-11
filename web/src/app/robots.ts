import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

// Public marketing and directory pages are crawlable; authenticated areas are
// not (they would render an empty shell or a login redirect to a crawler).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/client/", "/vendor/", "/internal/", "/rsvp/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
