"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Rings } from "@/components/ui/Rings";
import { SkeletonCard, SkeletonGroup } from "@/components/ui/Skeleton";
import { CATEGORY_ART } from "@/components/vendor/directory/categoryArt";
import { CategoryPicture } from "@/components/vendor/directory/CategoryPicture";
import { DirectoryControls } from "@/components/vendor/directory/DirectoryControls";
import { applyFilters, BUDGETS, budgetLabel, EMPTY_FILTERS, SORTS, type Filters, type Sort } from "@/components/vendor/directory/filters";
import { VendorCard } from "@/components/vendor/VendorCard";
import { apiGet, ApiError, categoryLabel, VENDOR_CATEGORIES, type DirectoryCard } from "@/lib/api";
import { EASE, fadeUp, motionSafe, staggerList, useReducedMotion } from "@/lib/motion";

// useSearchParams needs a Suspense boundary under the App Router.
export default function VendorDirectoryPage() {
  return (
    <Suspense fallback={null}>
      <VendorDirectory />
    </Suspense>
  );
}

function VendorDirectory() {
  const [cards, setCards] = useState<DirectoryCard[]>([]);
  // Seeded from ?category= and ?q= so the landing search form and category
  // index land on the right filter; an unknown category falls back to "Semua".
  const params = useSearchParams();
  const initial = params.get("category") ?? "";
  const [category, setCategory] = useState(VENDOR_CATEGORIES.some((c) => c.value === initial) ? initial : "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState<Filters>(() => {
    const budget = params.get("budget") ?? "";
    const sort = params.get("urut") ?? "";
    return {
      query: params.get("q") ?? "",
      city: params.get("kota") ?? "",
      budget: BUDGETS.some((b) => b.value === budget) ? budget : "",
      sort: SORTS.some((s) => s.value === sort) ? (sort as Sort) : "default",
    };
  });
  const reduced = useReducedMotion();

  useEffect(() => {
    const qs = category ? `?category=${category}` : "";
    apiGet<DirectoryCard[]>(`/api/v1/vendors${qs}`)
      .then((data) => {
        setCards(data ?? []);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat direktori.");
        setLoading(false);
      });
  }, [category, reloadKey]);

  // Deep link: mirror the current filters into the address bar (replace, no
  // navigation, no refetch) so a couple can share or come back to this exact
  // list. Same ?category= and ?q= names the landing page already sends.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (filters.query.trim()) qs.set("q", filters.query.trim());
    if (filters.city) qs.set("kota", filters.city);
    if (filters.budget) qs.set("budget", filters.budget);
    if (filters.sort !== "default") qs.set("urut", filters.sort);
    const search = qs.toString() ? `?${qs}` : "";
    if (search !== window.location.search) window.history.replaceState(null, "", search || window.location.pathname);
  }, [category, filters]);

  function selectCategory(value: string) {
    if (value === category) return;
    setLoading(true);
    setError(null);
    setFilters((f) => ({ ...f, city: "" }));
    setCategory(value);
  }

  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const resetFilters = () => setFilters(EMPTY_FILTERS);
  function resetAll() {
    resetFilters();
    selectCategory("");
  }

  const cities = useMemo(() => Array.from(new Set(cards.map((c) => c.city).filter(Boolean))).sort(), [cards]);
  const visible = useMemo(() => applyFilters(cards, filters), [cards, filters]);
  const ready = !loading && !error;

  // Removable chips for whatever narrows the list right now.
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (category) chips.push({ key: "cat", label: categoryLabel(category), clear: () => selectCategory("") });
  if (filters.query.trim()) chips.push({ key: "q", label: `"${filters.query.trim()}"`, clear: () => patch({ query: "" }) });
  if (filters.city) chips.push({ key: "city", label: filters.city, clear: () => patch({ city: "" }) });
  if (filters.budget) chips.push({ key: "budget", label: budgetLabel(filters.budget), clear: () => patch({ budget: "" }) });
  if (filters.sort !== "default")
    chips.push({ key: "sort", label: SORTS.find((s) => s.value === filters.sort)?.label ?? "", clear: () => patch({ sort: "default" }) });

  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main id="konten" className="flex-1">
        <section aria-labelledby="direktori-judul" className="dc-grain relative overflow-hidden">
          <div className="dc-container pb-8 pt-10 sm:pt-14 lg:pb-10 lg:pt-16">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
              <div className="max-w-3xl">
                <p className="dc-eyebrow">Direktori vendor</p>
                <h1 id="direktori-judul" className="mt-4 font-heading text-[clamp(2.5rem,5.4vw,4.6rem)] leading-[1] text-dc-ink">
                  Temukan vendor yang <span className="dc-em">pas untuk harimu.</span>
                </h1>
              </div>
              <p className="max-w-md text-base leading-relaxed text-dc-text-2 lg:pb-2">
                Lihat portofolio, harga mulai dari, dan ulasan dari booking yang sudah selesai. Pembayaranmu ditahan lewat escrow
                sampai acaramu selesai.
              </p>
            </div>

            {/* Category index as photo tiles: the fastest way in is a picture of
                what you need. One graded photo set (same warm light, same subject
                scale), label on a soft scrim. Motion purpose: tiles enter in a short
                CSS stagger on first paint; hover zooms the photo (this is the one
                you are about to open); the picked tile lifts with a gold ring and
                the gold rule glides to it (shared layout). Reduced motion: static.
                Phones: a swipeable row that snaps tile by tile. */}
            <ul
              aria-label="Pilih kategori"
              className="-mx-4 mt-7 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:mt-10 lg:grid lg:grid-cols-8 lg:overflow-visible lg:pb-0"
            >
              {[{ value: "", label: "Semua" }, ...VENDOR_CATEGORIES].map((c, i) => {
                const on = category === c.value;
                const art = c.value ? CATEGORY_ART[c.value] : null;
                return (
                  <li key={c.value || "all"} className="animate-fade-up w-[38%] shrink-0 snap-start sm:w-[22%] lg:w-auto" style={{ animationDelay: `${i * 50}ms` }}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => selectCategory(c.value)}
                      className="group block w-full rounded-xl text-left"
                    >
                      <span
                        className={`relative block aspect-4/5 overflow-hidden rounded-xl bg-dc-cream transition-[box-shadow,transform] duration-500 ease-dc ${
                          on
                            ? "shadow-lift ring-2 ring-dc-gold ring-offset-2 ring-offset-dc-ivory motion-safe:-translate-y-1"
                            : "shadow-soft motion-safe:group-hover:-translate-y-0.5"
                        }`}
                      >
                        {art ? (
                          <CategoryPicture
                            art={{ ...art, src: art.src.replace("-1400.", "-720.") }}
                            sizes="(min-width: 1024px) 150px, (min-width: 640px) 22vw, 38vw"
                            decorative
                            className="transition-transform duration-700 ease-dc motion-safe:group-hover:scale-[1.06]"
                          />
                        ) : (
                          <AllCategoriesCollage />
                        )}
                        <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-dc-ink/90 via-dc-ink/55 via-45% to-transparent" />
                        <span className="absolute inset-x-2.5 bottom-2.5 block text-[0.95rem] font-semibold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] sm:inset-x-3 sm:bottom-3">
                          {!art && <Rings className="mb-1.5 block h-3.5 w-6 text-dc-gold-antique" stroke="currentColor" strokeWidth={5} />}
                          {c.label}
                          {on && <span className="sr-only">, dipilih</span>}
                          {on ? (
                            <motion.span layoutId="kategori-aktif" className="mt-1.5 block h-0.5 w-7 rounded-full bg-dc-gold-antique" transition={{ duration: reduced ? 0 : 0.45, ease: EASE }} />
                          ) : (
                            <span className="mt-1.5 block h-0.5 w-7" />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Sticky under the 72px navbar so search and filters stay in reach. */}
        <div className="sticky top-[72px] z-30 border-y border-dc-line bg-dc-ivory/95 py-3 lg:py-4">
          <div className="dc-container">
            <DirectoryControls
              category={category}
              onCategory={selectCategory}
              filters={filters}
              onChange={patch}
              onReset={resetAll}
              cities={cities}
              resultCount={visible.length}
              ready={ready}
            />
          </div>
        </div>

        <section aria-label="Hasil pencarian vendor" aria-busy={loading} className="dc-container pb-20 pt-8 lg:pt-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" className="font-heading text-[1.9rem] leading-tight text-dc-ink">
              {loading ? (
                <span className="text-dc-text-3">Mencari vendor...</span>
              ) : error ? (
                <span className="sr-only">Daftar vendor gagal dimuat</span>
              ) : (
                <>
                  <span className="lining-nums tabular-nums">{visible.length}</span> vendor{" "}
                  <span className="dc-em">{category ? categoryLabel(category) : "dari semua kategori"}</span>
                  {filters.city && <span className="text-dc-text-2"> di {filters.city}</span>}
                </>
              )}
            </p>
            {chips.length > 0 && (
              <ul aria-label="Filter aktif" className="flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <button
                      type="button"
                      onClick={chip.clear}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dc-line-strong bg-dc-white pl-3.5 pr-2.5 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink"
                    >
                      {chip.label}
                      <span className="sr-only">, hapus filter</span>
                      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-dc-text-3">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
                {chips.length > 1 && (
                  <li>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="min-h-11 px-2 text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
                    >
                      Hapus semua
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          {loading && (
            <SkeletonGroup label="Memuat vendor" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </SkeletonGroup>
          )}

          {!loading && error && (
            <ErrorState
              title="Daftar vendor belum bisa dimuat"
              body="Periksa koneksi internetmu, lalu coba lagi. Pilihan filtermu tetap tersimpan."
              onRetry={retry}
            />
          )}

          {ready && cards.length === 0 && (
            <EmptyState
              title={category ? `Belum ada vendor ${categoryLabel(category)}` : "Belum ada vendor"}
              body={
                category
                  ? "Vendor di kategori ini sedang kami kurasi. Sementara itu, lihat kategori lain yang juga kamu butuhkan."
                  : "Vendor sedang kami kurasi. Kembali lagi sebentar lagi."
              }
              action={
                category ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {VENDOR_CATEGORIES.filter((c) => c.value !== category)
                      .slice(0, 4)
                      .map((c) => (
                        <Button key={c.value} variant="ghost" size="sm" onClick={() => selectCategory(c.value)}>
                          {c.label}
                        </Button>
                      ))}
                    <Button size="sm" onClick={() => selectCategory("")}>
                      Semua kategori
                    </Button>
                  </div>
                ) : undefined
              }
            />
          )}

          {ready && cards.length > 0 && visible.length === 0 && (
            <EmptyState
              title="Belum ada yang cocok"
              body={
                <>
                  Tidak ada vendor yang memenuhi semua pilihanmu.
                  {filters.budget ? " Vendor yang harganya ditanyakan lewat chat tidak ikut tampil saat budget dipilih." : ""} Coba
                  longgarkan salah satu filter ini:
                </>
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {chips
                    .filter((c) => c.key !== "sort")
                    .map((c) => (
                      <Button key={c.key} variant="ghost" size="sm" onClick={c.clear}>
                        Tanpa {c.key === "q" ? "kata kunci" : c.label}
                      </Button>
                    ))}
                  <Button size="sm" onClick={resetAll}>
                    Lihat semua vendor
                  </Button>
                </div>
              }
            />
          )}

          {ready && visible.length > 0 && (
            // Cards glide to their new place when the sort changes and fade
            // when a filter removes them, so the list never jumps.
            <motion.ul
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={motionSafe(reduced, staggerList)}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((c) => (
                  <motion.li
                    key={c.id}
                    layout={!reduced}
                    className="scroll-mt-48"
                    variants={motionSafe(reduced, fadeUp)}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ layout: { duration: 0.45, ease: EASE } }}
                  >
                    <VendorCard card={c} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}

          {ready && visible.length > 0 && (
            <p className="mt-12 text-center text-sm text-dc-text-2">
              Ingin tahu cara booking dan pembayaran escrow bekerja?{" "}
              <Link href="/cara-kerja" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
                Baca cara kerja DuaCincin
              </Link>
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

/** "Semua" tile: four category photos in a 2x2 grid, so "all" reads as a
 * bit of everything instead of an empty box. */
const COLLAGE = ["venue", "mua_attire", "decor", "catering"];
function AllCategoriesCollage() {
  return (
    <span aria-hidden className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-dc-ivory transition-transform duration-700 ease-dc motion-safe:group-hover:scale-[1.06]">
      {COLLAGE.map((key) => (
        <span key={key} className="relative block overflow-hidden">
          <Image src={CATEGORY_ART[key].src.replace("-1400.", "-720.")} alt="" fill sizes="80px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}
