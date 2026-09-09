"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { apiGet, ApiError, categoryLabel, formatRupiah, VENDOR_CATEGORIES, type DirectoryCard } from "@/lib/api";

export default function VendorDirectoryPage() {
  const [cards, setCards] = useState<DirectoryCard[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = category ? `?category=${category}` : "";
    apiGet<DirectoryCard[]>(`/api/v1/vendors${qs}`)
      .then((data) => {
        setCards(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat direktori.");
        setLoading(false);
      });
  }, [category]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl font-extrabold text-dc-navy sm:text-3xl">Cari Vendor</h1>
      <p className="mt-2 max-w-xl text-dc-black/60">
        Nama & kontak vendor baru terbuka setelah kamu masuk sebagai Client — semua diskusi tetap aman lewat DuaCincin.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${category === "" ? "bg-dc-navy text-dc-white" : "bg-dc-offwhite text-dc-navy"}`}
        >
          Semua
        </button>
        {VENDOR_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${category === c.value ? "bg-dc-navy text-dc-white" : "bg-dc-offwhite text-dc-navy"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <p className="mt-8 text-dc-black/60">Memuat…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}
      {!loading && !error && cards.length === 0 && (
        <p className="mt-8 text-dc-black/60">Belum ada vendor untuk kategori ini.</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.id}
            href={`/vendors/${c.id}`}
            className="group overflow-hidden rounded-2xl border border-dc-black/10 bg-dc-white transition hover:shadow-md"
          >
            <div className="relative h-40 w-full bg-dc-offwhite">
              {c.sample_image && (
                <Image
                  src={c.sample_image}
                  alt={`Contoh portofolio vendor ${categoryLabel(c.category)}`}
                  fill
                  className="object-cover blur-sm transition group-hover:blur-[2px]"
                  unoptimized
                />
              )}
              <span className="absolute bottom-2 left-2 rounded-full bg-dc-black/60 px-2 py-0.5 text-xs text-dc-white">
                Masuk untuk lihat detail
              </span>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-dc-gold">{categoryLabel(c.category)}</p>
              <p className="mt-1 font-medium text-dc-navy">{c.city}</p>
              <p className="mt-1 text-sm text-dc-black/60">
                {formatRupiah(c.price_min)} – {formatRupiah(c.price_max)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
