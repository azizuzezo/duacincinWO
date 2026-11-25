"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LoadError, wdButton } from "@/components/home/ui";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { FilterSidebar, MobileFilters } from "@/components/vendor/directory/DirectoryControls";
import { applyFilters, BUDGETS, budgetLabel, EMPTY_FILTERS, SORTS, type Filters, type Sort } from "@/components/vendor/directory/filters";
import { BackToTop, CountNumber, ListingGrid } from "@/components/vendor/directory/ListingMotion";
import { CATEGORY_ART } from "@/components/vendor/directory/categoryArt";
import { ActiveChips, CategoryStrip, type Chip, GridSkeleton, ListingEmpty, ListingHeader, TEXT_LINK } from "@/components/vendor/directory/ListingParts";
import { apiGet, categoryLabel, VENDOR_CATEGORIES, type DirectoryCard, vendorCities } from "@/lib/api";

export type DirectoryParams = { category?: string; q?: string; kota?: string; budget?: string; urut?: string };

/** The directory. The server page passes the URL's filters and the vendor
 * list it already fetched, so the first HTML (what search engines read)
 * holds the heading and every vendor card; the browser takes over after. */
export function VendorDirectory({ search, initialCards }: { search: DirectoryParams; initialCards: DirectoryCard[] | null }) {
  const [cards, setCards] = useState<DirectoryCard[]>(initialCards ?? []);
  // Seeded from ?category= and ?q= so the landing search form and category
  // index land on the right filter; an unknown category falls back to "Semua".
  const params = { get: (k: keyof DirectoryParams) => search[k] ?? null };
  const initial = params.get("category") ?? "";
  const [category, setCategory] = useState(VENDOR_CATEGORIES.some((c) => c.value === initial) ? initial : "");
  const [loading, setLoading] = useState(initialCards === null);
  const [error, setError] = useState(false);
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

  useEffect(() => {
    const qs = category ? `?category=${category}` : "";
    apiGet<DirectoryCard[]>(`/api/v1/vendors${qs}`)
      .then((data) => {
        setCards(data ?? []);
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
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
    setError(false);
    setFilters((f) => ({ ...f, city: "" }));
    setCategory(value);
  }

  function retry() {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  }

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const resetFilters = () => setFilters(EMPTY_FILTERS);
  function resetAll() {
    resetFilters();
    selectCategory("");
  }

  const cityCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) for (const city of vendorCities(c)) m.set(city, (m.get(city) ?? 0) + 1);
    return m;
  }, [cards]);
  const cities = useMemo(() => Array.from(cityCounts.keys()).sort(), [cityCounts]);
  const visible = useMemo(() => applyFilters(cards, filters), [cards, filters]);
  const ready = !loading && !error;

  // Removable chips for whatever narrows the list right now.
  const chips: Chip[] = [];
  if (category) chips.push({ key: "cat", label: categoryLabel(category), clear: () => selectCategory("") });
  if (filters.query.trim()) chips.push({ key: "q", label: `"${filters.query.trim()}"`, clear: () => patch({ query: "" }) });
  if (filters.city) chips.push({ key: "city", label: filters.city, clear: () => patch({ city: "" }) });
  if (filters.budget) chips.push({ key: "budget", label: budgetLabel(filters.budget), clear: () => patch({ budget: "" }) });
  if (filters.sort !== "default")
    chips.push({ key: "sort", label: SORTS.find((s) => s.value === filters.sort)?.label ?? "", clear: () => patch({ sort: "default" }) });

  const controls = { category, onCategory: selectCategory, filters, onChange: patch, onReset: resetAll, cities, cityCounts, resultCount: visible.length, ready };
  const label = category ? categoryLabel(category) : "";
  const title = category ? `Vendor ${label} di Indonesia` : "Semua vendor pernikahan";

  return (
    <div className="wd flex min-h-screen flex-col bg-white">
      <Navbar />
      <main id="konten" className="flex-1">
        <div className="wd-container pb-16">
          <section aria-labelledby="direktori-judul">
            <ListingHeader
              id="direktori-judul"
              crumbs={[{ name: "Beranda", href: "/" }, ...(category ? [{ name: "Vendor", href: "/vendors" }, { name: label }] : [{ name: "Vendor" }])]}
              title={title}
              sub="Lihat portofolio dan harga mulai dari, lalu bayar aman lewat escrow DuaCincin."
              image={category && CATEGORY_ART[category] ? CATEGORY_ART[category].src : "/banner/vendor.webp"}
            />
            <div className="mt-5 border-b border-wd-line pb-4">
              <CategoryStrip active={category} onPick={selectCategory} withAll />
            </div>
          </section>

          <div className="mt-6 lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
            <aside aria-label="Filter vendor" className="hidden lg:block">
              <div className="sticky top-[128px] max-h-[calc(100svh-144px)] overflow-y-auto overscroll-contain pb-6 pr-1 [scrollbar-width:thin]">
                <FilterSidebar {...controls} />
              </div>
            </aside>

            <section aria-label="Hasil pencarian vendor" aria-busy={loading} className="min-w-0">
              <div className="lg:hidden">
                <MobileFilters {...controls} />
              </div>
              <div className="mt-4 flex flex-col gap-3 lg:mt-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p role="status" className="text-[0.95rem] text-wd-text">
                  {loading ? (
                    <span className="text-wd-muted">Mencari vendor...</span>
                  ) : error ? (
                    <span className="sr-only">Daftar vendor gagal dimuat</span>
                  ) : (
                    <>
                      Menampilkan <CountNumber value={visible.length} /> vendor
                      {category && <> {label}</>}
                      {filters.city && <> di {filters.city}</>}
                    </>
                  )}
                </p>
                <ActiveChips chips={chips} onClearAll={resetAll} />
              </div>

              <div className="mt-6">
                {loading && <GridSkeleton />}

                {!loading && error && <LoadError what="Daftar vendor" onRetry={retry} href="/" hrefLabel="Ke beranda" />}

                {ready && cards.length === 0 && (
                  <ListingEmpty
                    title={category ? `Belum ada vendor ${label}` : "Belum ada vendor"}
                    body={category ? "Vendor di kategori ini sedang kami verifikasi. Sementara itu, lihat kategori lain yang juga kamu butuhkan." : "Vendor sedang kami verifikasi. Kembali lagi sebentar lagi."}
                    actions={
                      category ? (
                        <>
                          {VENDOR_CATEGORIES.filter((c) => c.value !== category)
                            .slice(0, 4)
                            .map((c) => (
                              <button key={c.value} type="button" onClick={() => selectCategory(c.value)} className={wdButton({ variant: "outline", size: "sm" })}>
                                {c.label}
                              </button>
                            ))}
                          <button type="button" onClick={() => selectCategory("")} className={wdButton({ size: "sm" })}>
                            Semua kategori
                          </button>
                        </>
                      ) : undefined
                    }
                  />
                )}

                {ready && cards.length > 0 && visible.length === 0 && (
                  <ListingEmpty
                    title="Belum ada yang cocok"
                    body={
                      <>
                        Tidak ada vendor yang memenuhi semua pilihanmu.
                        {filters.budget ? " Vendor yang harganya ditanyakan lewat chat tidak ikut tampil saat budget dipilih." : ""} Coba longgarkan salah satu filter.
                      </>
                    }
                    actions={
                      <>
                        {chips
                          .filter((c) => c.key !== "sort")
                          .map((c) => (
                            <button key={c.key} type="button" onClick={c.clear} className={wdButton({ variant: "outline", size: "sm" })}>
                              Tanpa {c.key === "q" ? "kata kunci" : c.label}
                            </button>
                          ))}
                        <button type="button" onClick={resetAll} className={wdButton({ size: "sm" })}>
                          Lihat semua vendor
                        </button>
                      </>
                    }
                  />
                )}

                {ready && visible.length > 0 && <ListingGrid cards={visible} />}

                {ready && visible.length > 0 && (
                  <p className="mt-12 text-center text-[0.9rem] text-wd-text">
                    Ingin tahu cara booking dan escrow bekerja?{" "}
                    <Link href="/cara-kerja" className={TEXT_LINK}>
                      Baca cara kerja DuaCincin
                    </Link>
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <BackToTop />
      <Footer />
    </div>
  );
}
