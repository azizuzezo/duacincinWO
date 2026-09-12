"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <div className="flex min-h-screen flex-col bg-dc-offwhite">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <PageHeader
          title="Cari Vendor"
          subtitle="Jelajahi portofolio vendor terverifikasi secara bebas. Masuk saat kamu siap chat dan booking, semua diskusi tetap aman lewat DuaCincin."
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${category === "" ? "bg-dc-navy text-dc-white" : "bg-dc-white text-dc-navy hover:bg-dc-navy/5"}`}
          >
            Semua
          </button>
          {VENDOR_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${category === c.value ? "bg-dc-navy text-dc-white" : "bg-dc-white text-dc-navy hover:bg-dc-navy/5"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading && <p className="mt-8 text-dc-black/60">Memuat…</p>}
        {error && <p className="mt-8 text-sm text-red-600">{error}</p>}
        {!loading && !error && cards.length === 0 && (
          <div className="mt-8">
            <EmptyState title="Belum ada vendor untuk kategori ini" body="Coba kategori lain atau kembali lagi nanti." />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.id} href={`/vendors/${c.id}`} className="group">
              <Card className="overflow-hidden transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-dc-navy/10">
                <div className="relative h-40 w-full bg-dc-navy/5">
                  {c.sample_image && (
                    <Image
                      src={c.sample_image}
                      alt={`Portofolio ${c.business_name}`}
                      fill
                      className="object-cover transition group-hover:scale-105"
                      unoptimized
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-dc-gold">{categoryLabel(c.category)}</p>
                  <p className="mt-1 font-bold text-dc-navy">{c.business_name}</p>
                  <p className="mt-0.5 text-sm text-dc-black/60">{c.city}</p>
                  {c.review_count > 0 && (
                    <p className="mt-0.5 text-sm text-dc-gold">
                      ★ {c.average_rating.toFixed(1)} <span className="text-dc-black/50">({c.review_count})</span>
                    </p>
                  )}
                  <p className="mt-1 text-sm text-dc-black/60">
                    {formatRupiah(c.price_min)} – {formatRupiah(c.price_max)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
