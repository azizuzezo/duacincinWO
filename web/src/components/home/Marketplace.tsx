"use client";

// The shelf: the page's H1 and the main grid, marketplace style. Sort tabs
// (underline, the gold one slides) and category chips sit over a dense grid
// of vendor cards, two rows at a time, with a "see all" under it. Tabs sort
// only on facts the directory returns: reviews (completed bookings), rating,
// the vendor's own "mulai dari" price. Nothing is invented.
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import { useDirectory } from "@/components/landing/useHomeData";
import { categoryLabel, vendorCategoryList, VENDOR_CATEGORIES, type DirectoryCard } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { LoadError, SeeAll, wdButton } from "./ui";
import { SkeletonCard, VendorCard } from "./VendorRail";
import Link from "next/link";

type Tab = "rekomendasi" | "terlaris" | "rating" | "harga";

const TABS: { id: Tab; label: string }[] = [
  { id: "rekomendasi", label: "Rekomendasi" },
  { id: "terlaris", label: "Terlaris" },
  { id: "rating", label: "Rating tertinggi" },
  { id: "harga", label: "Harga terendah" },
];

const COUNT = 10;

const SORT: Record<Tab, (a: DirectoryCard, b: DirectoryCard) => number> = {
  // Complete listings first (photo, price), then reviews and rating.
  rekomendasi: (a, b) =>
    Number(!!b.sample_image) - Number(!!a.sample_image) ||
    Number(b.price_min > 0) - Number(a.price_min > 0) ||
    b.review_count - a.review_count ||
    b.average_rating - a.average_rating,
  terlaris: (a, b) => b.review_count - a.review_count || b.average_rating - a.average_rating,
  rating: (a, b) => b.average_rating - a.average_rating || b.review_count - a.review_count,
  harga: (a, b) => (a.price_min || Number.MAX_SAFE_INTEGER) - (b.price_min || Number.MAX_SAFE_INTEGER),
};

export function Marketplace() {
  const directory = useDirectory();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>("rekomendasi");
  const [cat, setCat] = useState("");

  const all = useMemo(() => (directory.status === "ready" ? directory.data ?? [] : []), [directory]);
  const chips = useMemo(() => {
    const present = new Set(all.flatMap((c) => vendorCategoryList(c)));
    return VENDOR_CATEGORIES.filter((c) => present.has(c.value)).slice(0, 7);
  }, [all]);
  const list = useMemo(() => {
    const byCat = cat ? all.filter((c) => vendorCategoryList(c).includes(cat)) : all;
    return [...byCat].sort(SORT[tab]);
  }, [all, cat, tab]);
  const shown = list.slice(0, COUNT);
  const loading = directory.status === "loading";

  return (
    <section aria-labelledby="pilihan-judul" className="bg-white pb-12 pt-8 sm:pt-10">
      <div className="wd-container">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h1 id="pilihan-judul" className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
              Vendor pernikahan terverifikasi
            </h1>
            <p className="mt-1.5 text-[0.95rem] text-wd-muted">Diverifikasi tim DuaCincin, bayar lewat Dana Aman.</p>
          </div>
          <SeeAll href={cat ? `/kategori/${cat}` : "/vendors"}>{cat ? `Semua ${categoryLabel(cat)}` : "Semua vendor"}</SeeAll>
        </div>

        <div role="tablist" aria-label="Urutkan vendor" className="wd-rail mt-5 flex gap-7 overflow-x-auto border-b border-wd-line">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`relative min-h-11 shrink-0 pb-3 pt-2 text-[0.97rem] transition-colors ${on ? "font-semibold text-wd-ink" : "text-wd-muted hover:text-wd-ink"}`}
              >
                {t.label}
                {on && <motion.span layoutId="shelf-tab" transition={{ duration: reduced ? 0 : 0.3, ease: EASE }} className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-wd-accent" />}
              </button>
            );
          })}
        </div>

        {chips.length > 1 && (
          <div role="group" aria-label="Saring kategori" className="wd-rail -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {[{ value: "", label: "Semua" }, ...chips].map((c) => {
              const on = cat === c.value;
              return (
                <button
                  key={c.value || "semua"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCat(c.value)}
                  className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-4 text-[0.88rem] transition-colors ${on ? "border-wd-accent bg-wd-accent font-semibold text-wd-ink" : "border-wd-line text-wd-text hover:border-wd-accent hover:bg-wd-accent-wash"}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        <ul role="tabpanel" aria-label="Daftar vendor" className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-5 lg:gap-x-5">
          {loading ? (
            Array.from({ length: COUNT }, (_, i) => (
              <li key={i}>
                <SkeletonCard />
              </li>
            ))
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {directory.status !== "error" &&
                shown.map((c, i) => (
                  <motion.li
                    key={c.id}
                    layout={!reduced}
                    initial={{ opacity: 0, y: reduced ? 0 : 14 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: reduced ? 0 : Math.min(i, 8) * 0.03, ease: EASE } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  >
                    <VendorCard card={c} />
                  </motion.li>
                ))}
            </AnimatePresence>
          )}
        </ul>
        <p className="sr-only" aria-live="polite">
          {directory.status === "ready" ? `${shown.length} vendor ditampilkan` : ""}
        </p>

        {directory.status === "ready" && list.length > COUNT && (
          <div className="mt-9 flex justify-center">
            <Link href={cat ? `/kategori/${cat}` : "/vendors"} className={wdButton({ variant: "outline", size: "lg" })}>
              Lihat {list.length - COUNT} vendor lainnya
            </Link>
          </div>
        )}
        {directory.status === "error" && (
          <div className="mt-2">
            <LoadError what="Daftar vendor" onRetry={directory.retry} href="/vendors" hrefLabel="Buka direktori" />
          </div>
        )}
        {directory.status === "ready" && all.length === 0 && (
          <p className="mt-2 rounded-[18px] border border-wd-line bg-wd-paper p-6 text-wd-text">Vendor baru sedang diverifikasi tim kami. Cari per kategori dan kota di direktori vendor.</p>
        )}
      </div>
    </section>
  );
}
