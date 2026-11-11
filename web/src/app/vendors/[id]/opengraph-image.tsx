import { categoryLabel } from "@/lib/api";
import { OG_CONTENT_TYPE, OG_SIZE, renderBrandCard, renderCard } from "@/lib/og";
import { fetchPublicVendor } from "@/lib/server-api";

// Vendor share preview: the vendor's first portfolio photo in the arch, with
// the business name, category and city. Any failure (API down, unknown id,
// unreadable photo source) returns the default DuaCincin card instead.
export const alt = "Profil vendor pernikahan di DuaCincin";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 300;

const CACHE = { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } };

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const v = await fetchPublicVendor(id);
    if (!v) return await renderBrandCard(CACHE);
    const where = [categoryLabel(v.category), v.city].filter(Boolean).join(" · ");
    // No photo yet: the card shows the logo in the arch (never someone else's photo).
    return await renderCard({ kind: "vendor", name: v.business_name, where }, v.portfolio?.[0]?.url ? { src: v.portfolio[0].url } : null, CACHE);
  } catch {
    return renderBrandCard(CACHE);
  }
}
