"use client";

// Vendor rows from the public directory, marketplace style.
// 1. VendorPicks: the page's H1 ("Vendor pernikahan terverifikasi") with
//    category chips (toggle buttons, only categories that have vendors)
//    filtering one row of cards. Reviews first, then rating, then photos.
// 2. CategoryRows: one row per category for the categories with the most
//    vendors ("Venue di DuaCincin" + "Lihat semua Venue").
// States: skeleton while loading, a retry panel when the directory fails, a
// pointer to the directory when it is empty. Nothing is invented.
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { useDirectory } from "@/components/landing/useHomeData";
import { categoryLabel, vendorCategoryList, VENDOR_CATEGORIES, type DirectoryCard } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { LoadError, SeeAll } from "./ui";
import { rankVendors, VendorRail } from "./VendorRail";

const ROW = 10;

function useRanked() {
  const directory = useDirectory();
  const all = useMemo(() => (directory.status === "ready" ? rankVendors(directory.data ?? []) : []), [directory]);
  return { directory, all };
}

function byCategory(all: DirectoryCard[], cat: string) {
  return cat ? all.filter((c) => vendorCategoryList(c).includes(cat)) : all;
}

export function VendorPicks() {
  const { directory, all } = useRanked();
  const reduced = useReducedMotion();
  const [cat, setCat] = useState("");
  const chips = useMemo(() => {
    const present = new Set(all.flatMap((c) => vendorCategoryList(c)));
    return VENDOR_CATEGORIES.filter((c) => present.has(c.value)).slice(0, 6);
  }, [all]);
  const shown = byCategory(all, cat).slice(0, ROW);

  return (
    <section aria-labelledby="pilihan-judul" className="bg-white pb-12 pt-10 sm:pt-12">
      <div className="wd-container">
        <VendorRail
          id="pilihan-judul"
          as="h1"
          title="Vendor pernikahan terverifikasi"
          sub="Diverifikasi tim DuaCincin, bayar aman lewat escrow."
          seeAll={{ href: cat ? `/kategori/${cat}` : "/vendors", label: cat ? `Semua ${categoryLabel(cat)}` : "Semua vendor" }}
          cards={directory.status === "error" ? [] : shown}
          loading={directory.status === "loading"}
        >
          {chips.length > 1 && (
            <div role="group" aria-label="Saring kategori" className="wd-rail -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
              {[{ value: "", label: "Semua" }, ...chips].map((c) => {
                const on = cat === c.value;
                return (
                  <button
                    key={c.value || "semua"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCat(c.value)}
                    className={`relative inline-flex min-h-10 shrink-0 items-center rounded-full border px-5 text-[0.92rem] transition-colors ${on ? "border-wd-accent text-wd-ink" : "border-wd-accent-line text-wd-accent-ink hover:bg-wd-accent-wash"}`}
                  >
                    {/* The gold fill slides from the old chip to the new one. */}
                    {on && <motion.span layoutId="pilihan-chip" transition={{ duration: reduced ? 0 : 0.32, ease: EASE }} className="absolute inset-0 rounded-full bg-wd-accent" />}
                    <span className="relative">{c.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {directory.status === "ready" ? `${shown.length} vendor ditampilkan${cat ? ` untuk ${categoryLabel(cat)}` : ""}` : ""}
          </p>
        </VendorRail>

        {directory.status === "error" && (
          <div className="mt-2">
            <LoadError what="Daftar vendor" onRetry={directory.retry} href="/vendors" hrefLabel="Buka direktori" />
          </div>
        )}
        {directory.status === "ready" && all.length === 0 && (
          <p className="mt-2 rounded-[18px] border border-wd-line bg-wd-paper p-6 text-wd-text">
            Vendor baru sedang diverifikasi tim kami. Cari per kategori dan kota di <SeeAll href="/vendors">direktori vendor</SeeAll>
          </p>
        )}
      </div>
    </section>
  );
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
