import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryListing } from "@/components/vendor/CategoryListing";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/api";
import { cityFromSlug, fetchDirectory } from "@/lib/server-api";

type Props = { params: Promise<{ kategori: string; kota: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategori, kota } = await params;
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori)) return {};
  const label = categoryLabel(kategori);
  const city = cityFromSlug(kota);
  return {
    title: `Vendor ${label} di ${city}`,
    description: `Vendor ${label} pernikahan di ${city}: portofolio, harga mulai dari, dan pembayaran aman lewat escrow DuaCincin.`,
  };
}

export default async function CategoryCityPage({ params }: Props) {
  const { kategori, kota } = await params;
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori)) notFound();
  const city = cityFromSlug(kota);
  const { cards, failed } = await fetchDirectory(kategori, city);
  return <CategoryListing category={kategori} cityName={city} cards={cards} failed={failed} />;
}
