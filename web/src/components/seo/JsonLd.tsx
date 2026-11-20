import { COMPANY } from "@/lib/company";
import { SITE_URL } from "@/lib/site";
import { FOUNDERS } from "@/lib/team";

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
  description:
    "DuaCincin adalah marketplace vendor pernikahan di Indonesia: direktori vendor terverifikasi, chat dan booking, serta pembayaran escrow yang ditahan sampai acara selesai.",
  // Square raster logo (PNG) for search engines; WebP-only logos are not always read.
  logo: { "@type": "ImageObject", url: `${SITE_URL}/email/logo.png`, width: 192, height: 192 },
  areaServed: { "@type": "Country", name: "Indonesia" },
  // Registered electronic system (PSE) number: a public, checkable identifier.
  identifier: { "@type": "PropertyValue", propertyID: "Tanda Daftar PSE Kominfo", value: COMPANY.pseNumber },
  founder: FOUNDERS.map((f) => personLd(f)),
} as const;

/** A founder as a Person, linked to their public profiles. */
export function personLd(f: (typeof FOUNDERS)[number]) {
  return {
    "@type": "Person",
    name: f.name,
    jobTitle: f.role,
    image: `${SITE_URL}${f.photo}`,
    ...(f.links?.length && { sameAs: f.links.map((l) => l.href) }),
  };
}

/** Reference to the publisher without repeating its whole block. */
export const ORGANIZATION_REF = { "@id": ORGANIZATION_LD["@id"] } as const;
export const WEBSITE_REF = { "@id": `${SITE_URL}/#website` } as const;

/** WebPage-type node (WebPage, AboutPage, CollectionPage, ...) tied to the site. */
export function webPageLd(type: string, path: string, name: string, description?: string) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${SITE_URL}${path}#webpage`,
    url: `${SITE_URL}${path}`,
    name,
    ...(description && { description }),
    inLanguage: "id-ID",
    isPartOf: WEBSITE_REF,
    publisher: ORGANIZATION_REF,
  };
}

/** BreadcrumbList from visible crumbs ({ name, path }), with absolute URLs. */
export function breadcrumbLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.path}` })),
  };
}
