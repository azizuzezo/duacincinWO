"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { VendorCard } from "@/components/vendor/VendorCard";
import { apiGet, ApiError, categoryLabel, VENDOR_CATEGORIES, type DirectoryCard } from "@/lib/api";

type Sort = "default" | "rating" | "price_asc" | "price_desc";

const FIELD =
  "min-h-11 rounded-md border border-dc-ink/20 bg-dc-white px-3 text-sm text-dc-black transition placeholder:text-dc-black/50 focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold";

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
  // Seeded from ?category= so the landing search form and category strip land
  // on the right filter; an unknown value falls back to "Semua".
  const params = useSearchParams();
  const initial = params.get("category") ?? "";
  const [category, setCategory] = useState(VENDOR_CATEGORIES.some((c) => c.value === initial) ? initial : "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<Sort>("default");

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

  function selectCategory(value: string) {
    if (value === category) return;
    setLoading(true);
    setError(null);
    setCity("");
    setCategory(value);
  }

  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  const cities = useMemo(() => Array.from(new Set(cards.map((c) => c.city).filter(Boolean))).sort(), [cards]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = cards.filter(
      (c) => (!city || c.city === city) && (!q || `${c.business_name} ${c.city}`.toLowerCase().includes(q)),
    );
    if (sort === "rating") list = [...list].sort((a, b) => b.average_rating - a.average_rating);
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price_min - b.price_min);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.price_min - a.price_min);
    return list;
  }, [cards, city, query, sort]);

  const filtered = Boolean(query.trim() || city);

  function resetFilters() {
    setQuery("");
    setCity("");
    setSort("default");
  }

  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar overlay />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden bg-dc-ink">
          <Image src="/stock/chandelier.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-dc-ink/65" aria-hidden />
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-36 sm:px-6 lg:px-10 lg:pb-20 lg:pt-44">
            <h1 className="max-w-3xl font-heading text-5xl leading-[1] text-dc-white sm:text-7xl">
              Temukan vendor yang <span className="dc-em-light">cocok dengan acaramu</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-dc-white/85">
              Portofolio, harga mulai dari, dan ulasan dari booking yang sudah selesai. Semua pembayaran lewat escrow
              DuaCincin.
            </p>
          </div>
        </section>

        {/* Two stacked rows (categories, then search/city/sort): one row cannot fit
            eight chips plus three fields at 1200px without clipping chips. */}
        <div className="border-b border-dc-ink/10">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-3 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-3">
              <div role="group" aria-label="Kategori vendor" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:pb-0">
                {[{ value: "", label: "Semua" }, ...VENDOR_CATEGORIES].map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value || "all"}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectCategory(c.value)}
                      className={`min-h-11 shrink-0 rounded-md border px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                        active
                          ? "border-dc-ink bg-dc-ink text-dc-white"
                          : "border-dc-ink/20 bg-transparent text-dc-ink hover:border-dc-ink hover:bg-dc-white"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-72">
                  <label htmlFor="vendor-search" className="sr-only">
                    Cari nama vendor atau kota
                  </label>
                  <input
                    id="vendor-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari nama atau kota"
                    className={`${FIELD} w-full`}
                  />
                </div>
                <label className="sr-only" htmlFor="vendor-city">
                  Kota
                </label>
                <select id="vendor-city" value={city} onChange={(e) => setCity(e.target.value)} className={`${FIELD} sm:w-40`}>
                  <option value="">Semua kota</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="vendor-sort">
                  Urutkan
                </label>
                <select id="vendor-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${FIELD} sm:w-44`}>
                  <option value="default">Urutan awal</option>
                  <option value="rating">Rating tertinggi</option>
                  <option value="price_asc">Harga mulai terendah</option>
                  <option value="price_desc">Harga mulai tertinggi</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <section className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-10" aria-busy={loading}>
          {!loading && !error && cards.length > 0 && (
            <div className="mb-6 flex items-center justify-between gap-4" role="status">
              <p className="text-sm text-dc-black/70">
                {visible.length} vendor{category ? ` di kategori ${categoryLabel(category)}` : ""}
              </p>
              {(filtered || sort !== "default") && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-11 text-sm font-semibold text-dc-clay underline underline-offset-2 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                >
                  Hapus filter
                </button>
              )}
            </div>
          )}

          {loading && <DirectorySkeleton />}

          {!loading && error && (
            <div role="alert" className="flex flex-col items-center rounded-lg border border-dc-ink/10 bg-dc-white px-6 py-14 text-center">
              <p className="font-heading text-2xl text-dc-ink">Direktori belum bisa dimuat</p>
              <p className="mt-2 max-w-sm text-sm text-dc-black/70">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-6 inline-flex min-h-11 items-center rounded-md bg-dc-ink px-5 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
              >
                Coba lagi
              </button>
            </div>
          )}

          {!loading && !error && cards.length === 0 && (
            <EmptyState
              title="Belum ada vendor di kategori ini"
              body="Coba kategori lain, atau kembali lagi nanti saat vendor baru bergabung."
            />
          )}

          {!loading && !error && cards.length > 0 && visible.length === 0 && (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-dc-ink/20 bg-dc-white/60 px-6 py-14 text-center">
              <p className="font-heading text-2xl text-dc-ink">Tidak ada vendor yang cocok</p>
              <p className="mt-2 max-w-sm text-sm text-dc-black/70">Ubah kata kunci atau kota, atau hapus filter untuk melihat semua.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex min-h-11 items-center rounded-md border border-dc-ink/25 px-5 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink hover:bg-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
              >
                Hapus filter
              </button>
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c, i) => {
                const featured = i === 0 && visible.length >= 4;
                return (
                  <li key={c.id} className={featured ? "sm:col-span-2" : ""}>
                    <VendorCard card={c} horizontal={featured} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div role="status" aria-label="Memuat vendor" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={i === 0 ? "sm:col-span-2" : ""}>
          <div className={`animate-pulse rounded-lg bg-dc-ink/10 motion-reduce:animate-none ${i === 0 ? "aspect-[16/9]" : "aspect-[4/5]"}`} />
          <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
          <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
