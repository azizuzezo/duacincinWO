"use client";

import { useEffect, useState } from "react";

import { apiGet, categoryLabel, type VendorProfile } from "@/lib/api";

export type VendorBrief = { name: string; category: string; city: string; photo?: string; photoAlt?: string };

// A booking only carries vendor_id, so the vendor's name and first portfolio
// photo come from the public vendor profile (same GET the vendor page uses).
// Cached per session so the list and the detail page share one request each.
const cache = new Map<string, Promise<VendorBrief | null>>();

function fetchVendor(id: string): Promise<VendorBrief | null> {
  let p = cache.get(id);
  if (!p) {
    p = apiGet<VendorProfile>(`/api/v1/vendors/${id}`)
      .then((v) => ({
        name: v.business_name,
        category: categoryLabel(v.category),
        city: v.city,
        photo: v.portfolio?.[0]?.url,
        photoAlt: v.portfolio?.[0]?.alt_text,
      }))
      .catch(() => {
        cache.delete(id);
        return null;
      });
    cache.set(id, p);
  }
  return p;
}

/** Vendor name/photo per id. Missing entries simply render without them. */
export function useVendorLookup(ids: string[]): Record<string, VendorBrief> {
  const [map, setMap] = useState<Record<string, VendorBrief>>({});
  const key = [...new Set(ids)].sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    for (const id of key.split(",")) {
      fetchVendor(id).then((v) => {
        if (!cancelled && v) setMap((prev) => (prev[id] ? prev : { ...prev, [id]: v }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  return map;
}
