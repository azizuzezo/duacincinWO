import { notFound } from "next/navigation";

import { fetchPublicPackages, fetchPublicReviews, fetchPublicVendorResult } from "@/lib/server-api";

import { VendorDetail } from "./_ui/VendorDetail";

// Cached at the edge like the category pages, refreshed every 5 minutes.
export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

// Server page: fetch the profile, packages and reviews here so the HTML that
// search engines read already holds the vendor's name (H1), story, prices
// and portfolio. A vendor that does not exist (or is not approved) is a real
// 404; an API outage still renders the page, which retries in the browser.
export default async function VendorDetailPage({ params }: PageProps<"/vendors/[id]">) {
  const { id } = await params;
  const [result, packages, reviews] = await Promise.all([fetchPublicVendorResult(id), fetchPublicPackages(id), fetchPublicReviews(id)]);
  if (result.notFound) notFound();
  return <VendorDetail id={id} initialProfile={result.vendor} initialPackages={packages} initialReviews={reviews} />;
}
