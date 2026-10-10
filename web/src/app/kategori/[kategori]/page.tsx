import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryListing } from "@/components/vendor/CategoryListing";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/api";
import { fetchDirectory } from "@/lib/server-api";

type Props = { params: Promise<{ kategori: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategori } = await params;
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori)) return {};
  const label = categoryLabel(kategori);
  return {
    title: `Vendor ${label} pernikahan terverifikasi`,
    description: `Bandingkan vendor ${label} pernikahan terverifikasi di Indonesia: portofolio, harga mulai dari, dan pembayaran aman lewat escrow DuaCincin.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { kategori } = await params;
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori)) notFound();
  const { cards, failed } = await fetchDirectory(kategori);
  return <CategoryListing category={kategori} cards={cards} failed={failed} />;
}
