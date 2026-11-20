import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryListing } from "@/components/vendor/CategoryListing";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/api";
import { cityFromSlug, citySlug, fetchDirectory } from "@/lib/server-api";
import { findRegion } from "@/lib/wilayah";

type Props = { params: Promise<{ kategori: string; kota: string }> };

/** The canonical city name for a slug, or null when it is not a real
 * kabupaten/kota (or "Jabodetabek"): those get a 404, never an empty page. */
function cityOf(kota: string): string | null {
  return findRegion(cityFromSlug(kota))?.city ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategori, kota } = await params;
  const city = cityOf(kota);
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori) || !city) return {};
  const label = categoryLabel(kategori);
  const { cards, failed } = await fetchDirectory(kategori, city);
  const n = !failed && cards.length > 0 ? `${cards.length} vendor ` : "";
  return {
    title: `Vendor ${label} Pernikahan di ${city}`,
    description: `Bandingkan ${n}vendor ${label} pernikahan di ${city}: portofolio, harga mulai dari, ulasan, dan pembayaran aman lewat escrow DuaCincin.`,
    alternates: { canonical: `/kategori/${kategori}/${citySlug(city)}` },
    // A city with no vendor yet stays reachable for visitors but out of search results.
    ...(!failed && cards.length === 0 && { robots: { index: false, follow: true } }),
  };
}

export default async function CategoryCityPage({ params }: Props) {
  const { kategori, kota } = await params;
  const city = cityOf(kota);
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori) || !city) notFound();
  const { cards, failed } = await fetchDirectory(kategori, city);
  return <CategoryListing category={kategori} cityName={city} cards={cards} failed={failed} />;
}
