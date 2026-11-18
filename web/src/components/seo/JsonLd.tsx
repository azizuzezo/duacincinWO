import { SITE_URL } from "@/lib/site";

/** Structured data for search engines. `<` is escaped so text from the API or
 * an article can never close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** The publisher block shared by the homepage, articles and vendor pages. */
export const ORGANIZATION_LD = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "DuaCincin",
  legalName: "PT Karsa Loka Semesta",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/duacincin-logo.webp`,
} as const;

/** BreadcrumbList from visible crumbs ({ name, path }), with absolute URLs. */
export function breadcrumbLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.path}` })),
  };
}
