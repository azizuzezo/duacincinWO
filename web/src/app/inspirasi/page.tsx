"use client";

import { useEffect, useState } from "react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { PinterestImageCard } from "@/components/PinterestImageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet, ApiError, type InspirationItem } from "@/lib/api";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

export default function InspirationGalleryPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<InspirationItem[]>("/api/v1/inspiration")
      .then((data) => setItems(data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat galeri inspirasi."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-dc-offwhite">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <PageHeader
            title="Inspirasi Pernikahan"
            subtitle={
              <>
                Kurasi langsung dari{" "}
                <a
                  href={PINTEREST_BOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-dc-gold hover:underline"
                >
                  papan Pinterest resmi DuaCincin
                </a>
                : nyata di Indonesia, bukan hasil AI, bukan stok generik.
              </>
            }
          />

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <div className="mt-10">
              <EmptyState title="Belum ada inspirasi" body="Galeri inspirasi akan segera hadir." />
            </div>
          )}

          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {items.map((item) => (
              <PinterestImageCard
                key={item.id}
                imageUrl={item.url}
                pinUrl={item.source_url || PINTEREST_BOARD_URL}
                alt={item.alt_text || item.caption || "Inspirasi pernikahan"}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
