import type { Metadata } from "next";

import { VENDOR_CATEGORIES } from "@/lib/api";
import { fetchDirectory } from "@/lib/server-api";

import { type DirectoryParams, VendorDirectory } from "./_ui/VendorDirectory";

export const metadata: Metadata = {
  // Filters live in the query string; every variant is the same page.
  alternates: { canonical: "/vendors" },
};

// Server page: the vendor list is fetched here (cached 5 minutes) so the HTML
// search engines read already holds the heading and every vendor card. The
// filters still run in the browser, from the same URL parameters.
export default async function VendorDirectoryPage({ searchParams }: PageProps<"/vendors">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const search: DirectoryParams = { category: one(sp.category), q: one(sp.q), kota: one(sp.kota), budget: one(sp.budget), urut: one(sp.urut) };
  const category = VENDOR_CATEGORIES.some((c) => c.value === search.category) ? search.category! : "";
  const { cards, failed } = await fetchDirectory(category);
  return <VendorDirectory search={search} initialCards={failed ? null : cards} />;
}
