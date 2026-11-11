import { artFor } from "@/components/vendor/directory/categoryArt";
import { categoryLabel, VENDOR_CATEGORIES } from "@/lib/api";
import { OG_CONTENT_TYPE, OG_SIZE, renderBrandCard, renderCard } from "@/lib/og";

// Category share preview (also used by /kategori/[kategori]/[kota]): the same
// category photo as the page, with "Vendor <Kategori>" and what it covers.
export const alt = "DuaCincin: vendor pernikahan terverifikasi per kategori";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return VENDOR_CATEGORIES.map((c) => ({ kategori: c.value }));
}

export default async function Image({ params }: { params: Promise<{ kategori: string }> }) {
  const { kategori } = await params;
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori)) return renderBrandCard();
  const art = artFor(kategori);
  return renderCard({ kind: "page", title: `Vendor ${categoryLabel(kategori)}`, line: `${art.covers}, dari vendor terverifikasi.` }, { src: art.src, focusX: 0.5 });
}
