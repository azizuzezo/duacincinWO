import type { DirectoryCard, VendorProfile } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Server-side directory fetch for the SEO category/city pages. Cached for 5
 * minutes. Returns the error flag instead of throwing so a backend outage
 * renders the page's error state rather than a 500. */
export async function fetchDirectory(category: string, city?: string): Promise<{ cards: DirectoryCard[]; failed: boolean }> {
  const qs = new URLSearchParams({ category });
  if (city) qs.set("city", city);
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/vendors?${qs}`, { next: { revalidate: 300 } });
    if (!res.ok) return { cards: [], failed: true };
    return { cards: ((await res.json()) as DirectoryCard[] | null) ?? [], failed: false };
  } catch {
    return { cards: [], failed: true };
  }
}

/** Public vendor profile for server metadata and share images. Cached for 5
 * minutes, gives up after 5 seconds, and returns null on any failure so the
 * caller falls back to the generic DuaCincin preview. */
export async function fetchPublicVendor(id: string): Promise<VendorProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/vendors/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const v = (await res.json()) as VendorProfile | null;
    return v?.business_name ? v : null;
  } catch {
    return null;
  }
}

/** "jakarta-selatan" -> "Jakarta Selatan" (display), and the API filter value. */
export function cityFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function citySlug(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}
