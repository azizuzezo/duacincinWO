"use client";

// Vendor rows from the public directory, marketplace style.
// CategoryRows: one row per category for the categories with the most
//    vendors ("Venue di DuaCincin" + "Lihat semua Venue").
// States: skeleton while loading, a retry panel when the directory fails, a
// pointer to the directory when it is empty. Nothing is invented.
import { useMemo } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { useDirectory } from "@/components/landing/useHomeData";
import { categoryLabel, vendorCategoryList, type DirectoryCard } from "@/lib/api";

import { rankVendors, VendorRail } from "./VendorRail";

const ROW = 10;

export function useRanked() {
  const directory = useDirectory();
  const all = useMemo(() => (directory.status === "ready" ? rankVendors(directory.data ?? []) : []), [directory]);
  return { directory, all };
}

export function byCategory(all: DirectoryCard[], cat: string) {
  return cat ? all.filter((c) => vendorCategoryList(c).includes(cat)) : all;
}

/** Rows for the categories with the most vendors (at least 3 each). */
export function CategoryRows({ max = 2, skip = 0 }: { max?: number; skip?: number }) {
  const { directory, all } = useRanked();
  const rows = useMemo(() => {
    const count: Record<string, number> = {};
    for (const c of all) for (const k of vendorCategoryList(c)) count[k] = (count[k] ?? 0) + 1;
    return Object.entries(count)
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(skip, skip + max)
      .map(([k]) => k);
  }, [all, max, skip]);
  if (directory.status !== "ready" || rows.length === 0) return null;

  return (
    <>
      {rows.map((k) => {
        const label = categoryLabel(k);
        const id = `baris-${k}`;
        return (
          <section key={k} aria-labelledby={id} className="bg-white py-10 sm:py-12">
            <Reveal className="wd-container">
              <VendorRail
                id={id}
                title={`${label} di DuaCincin`}
                sub="Lihat rekomendasi dengan semua budget"
                seeAll={{ href: `/kategori/${k}`, label: `Lihat semua ${label}` }}
                cards={byCategory(all, k).slice(0, ROW)}
              />
            </Reveal>
          </section>
        );
      })}
    </>
  );
}
