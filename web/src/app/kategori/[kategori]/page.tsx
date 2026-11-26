import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryListing } from "@/components/vendor/CategoryListing";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/api";
import { categoryIsIndexable, categoryTitle } from "@/lib/seo";
import { fetchDirectory } from "@/lib/server-api";

type Props = { params: Promise<{ kategori: string }> };

// Rendered on first visit (never at build time, when the API may be empty
// or unreachable), then served from the edge cache and refreshed every 5
// minutes, the same as the API cache.
export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategori } = await params;
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori)) return {};
  const label = categoryLabel(kategori);
  // The directory fetch is cached, so this and the page share one request. An outage
  // (failed) never flips an indexable page to noindex.
  const { cards, failed } = await fetchDirectory(kategori);
  const indexable = failed || categoryIsIndexable(kategori, cards.length);
  return {
    title: categoryTitle(label),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    description: `Bandingkan vendor ${label} pernikahan terverifikasi di Indonesia: portofolio, harga mulai dari, ulasan, dan pembayaran aman lewat Dana Aman (escrow) DuaCincin.`,
    alternates: { canonical: `/kategori/${kategori}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { kategori } = await params;
  if (!VENDOR_CATEGORIES.some((c) => c.value === kategori)) notFound();
  const { cards, failed } = await fetchDirectory(kategori);
  return <CategoryListing category={kategori} cards={cards} failed={failed} />;
}
