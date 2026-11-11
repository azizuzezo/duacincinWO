// Public origin of the site, for absolute URLs in share previews, the sitemap,
// robots.txt and JSON-LD. Defaults to production so a missing env var never
// ships "localhost" links again; set NEXT_PUBLIC_SITE_URL for previews.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.duacincin.id").replace(/\/+$/, "");

/** Base URL of the public Go API, for server-side fetches. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");

/** Root openGraph fields. A page that sets its own `openGraph` replaces the
 * parent object, so spread this in to keep the site name and locale. */
export const OPEN_GRAPH_BASE = { siteName: "DuaCincin", locale: "id_ID" } as const;
