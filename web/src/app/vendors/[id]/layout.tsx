import type { Metadata } from "next";

import { categoryLabel, type VendorProfile } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Profiles are public, so the title, description and share image come from
// the vendor itself. Any failure falls back to the generic site metadata.
export async function generateMetadata({ params }: LayoutProps<"/vendors/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/vendors/${encodeURIComponent(id)}`, { next: { revalidate: 300 } });
    if (!res.ok) return { title: "Profil Vendor" };
    const v = (await res.json()) as VendorProfile;
    const where = [categoryLabel(v.category), v.city].filter(Boolean).join(" di ");
    const title = `${v.business_name}: ${where}`;
    const description = (v.description?.trim() || `${v.business_name}, vendor pernikahan terverifikasi di DuaCincin.`).slice(0, 160);
    const photo = v.portfolio?.[0]?.url;
    return {
      title,
      description,
      openGraph: { title, description, type: "profile", ...(photo ? { images: [{ url: photo, alt: v.portfolio?.[0]?.alt_text || v.business_name }] } : {}) },
      twitter: { title, description, ...(photo ? { images: [photo] } : {}) },
    };
  } catch {
    return { title: "Profil Vendor" };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
