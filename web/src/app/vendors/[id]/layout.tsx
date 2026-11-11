import type { Metadata } from "next";

import { categoryLabel } from "@/lib/api";
import { fetchPublicVendor } from "@/lib/server-api";
import { OPEN_GRAPH_BASE } from "@/lib/site";

// Profiles are public, so the title and description come from the vendor
// itself. The share image is ./opengraph-image.tsx (vendor photo, name,
// category, city). Any failure falls back to the generic site metadata.
export async function generateMetadata({ params }: LayoutProps<"/vendors/[id]">): Promise<Metadata> {
  const { id } = await params;
  const v = await fetchPublicVendor(id);
  if (!v) return { title: "Profil Vendor" };
  const where = [categoryLabel(v.category), v.city].filter(Boolean).join(" di ");
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
