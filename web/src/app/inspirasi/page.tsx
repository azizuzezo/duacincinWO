"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { apiGet, ApiError, type InspirationItem } from "@/lib/api";

export default function InspirationGalleryPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<string[]>("/api/v1/inspiration/categories")
      .then((c) => setCategories(c ?? []))
      .catch(() => {
        /* filter chips opsional, tidak fatal kalau gagal */
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("q", query);
    const qs = params.toString() ? `?${params.toString()}` : "";

    apiGet<InspirationItem[]>(`/api/v1/inspiration${qs}`)
      .then((data) => {
        setItems(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat galeri.");
        setLoading(false);
      });
  }, [category, query]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl font-extrabold text-dc-navy sm:text-3xl">Inspirasi Pernikahan</h1>
      <p className="mt-2 max-w-xl text-dc-black/60">
        Kurasi foto pernikahan nyata di Indonesia — bukan hasil AI, bukan stok luar negeri.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari inspirasi (mis. dekorasi outdoor, gaun adat)…"
        className="mt-6 w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
      />

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${category === "" ? "bg-dc-navy text-dc-white" : "bg-dc-offwhite text-dc-navy"}`}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${category === c ? "bg-dc-navy text-dc-white" : "bg-dc-offwhite text-dc-navy"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-8 text-dc-black/60">Memuat…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="mt-8 text-dc-black/60">Belum ada inspirasi untuk pencarian ini.</p>}

      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {items.map((item) => (
          <div key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-dc-black/10 bg-dc-white">
            <div className="relative w-full" style={{ aspectRatio: "4 / 5" }}>
              <Image src={item.url} alt={item.alt_text || item.caption} fill className="object-cover" unoptimized />
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-dc-gold">{item.category}</p>
              {item.caption && <p className="mt-1 text-sm text-dc-black/80">{item.caption}</p>}
              {item.source_credit && <p className="mt-1 text-xs text-dc-black/40">{item.source_credit}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
