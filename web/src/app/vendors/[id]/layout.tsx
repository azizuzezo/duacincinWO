import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { categoriesLabel, vendorCities, type VendorProfile } from "@/lib/api";
import { fetchPublicVendor } from "@/lib/server-api";
import { OPEN_GRAPH_BASE, SITE_URL } from "@/lib/site";

// Profiles are public, so the title and description come from the vendor
// itself. The share image is ./opengraph-image.tsx (vendor photo, name,
// category, city). Any failure falls back to the generic site metadata.
export async function generateMetadata({ params }: LayoutProps<"/vendors/[id]">): Promise<Metadata> {
  const { id } = await params;
  const v = await fetchPublicVendor(id);
  if (!v) return { title: "Profil Vendor" };
  const where = [categoriesLabel(v), v.city].filter(Boolean).join(" di ");
  const title = where ? `${v.business_name}: ${where}` : v.business_name;
  const description = clip(v.description?.trim() || `${v.business_name}, vendor pernikahan terverifikasi di DuaCincin.`, 160);
  return {
    title,
    description,
    alternates: { canonical: `/vendors/${encodeURIComponent(id)}` },
    openGraph: { ...OPEN_GRAPH_BASE, title, description, type: "profile", url: `/vendors/${encodeURIComponent(id)}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Cut at a word boundary so previews never end mid-word. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:]+$/, "")}…`;
}

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/** LocalBusiness data for the profile. The rating is included only when there
 * are reviews; DuaCincin reviews come from completed bookings only. */
function vendorLd(id: string, v: VendorProfile) {
  const photo = v.portfolio?.[0]?.url;
  const price = v.price_min > 0 ? (v.price_max > v.price_min ? `${rupiah(v.price_min)} - ${rupiah(v.price_max)}` : rupiah(v.price_min)) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/vendors/${id}#vendor`,
    name: v.business_name,
    url: `${SITE_URL}/vendors/${id}`,
    ...(v.description?.trim() && { description: clip(v.description.trim(), 300) }),
    ...(photo && { image: photo }),
    ...(price && { priceRange: price }),
    areaServed: vendorCities(v).map((name) => ({ "@type": "City", name })),
    ...(v.review_count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: v.average_rating.toFixed(1), reviewCount: v.review_count, bestRating: 5, worstRating: 1 },
    }),
  };
}

export default async function Layout({ children, params }: LayoutProps<"/vendors/[id]">) {
  const { id } = await params;
  // Same cached request as generateMetadata, so this costs no extra API call.
  const v = await fetchPublicVendor(id);
  return (
    <>
      {v && <JsonLd data={vendorLd(id, v)} />}
      {children}
    </>
  );
}
