"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { PinterestImageCard } from "@/components/PinterestImageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, ApiError, type InspirationItem } from "@/lib/api";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

export default function InspirationGalleryPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    apiGet<InspirationItem[]>("/api/v1/inspiration")
      .then((data) => {
        setItems(data ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat galeri inspirasi."))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar overlay />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden bg-dc-ink">
          <Image src="/stock/stairs-flowers.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-dc-ink/65" aria-hidden />
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-36 sm:px-6 lg:px-10 lg:pb-20 lg:pt-44">
            <h1 className="max-w-3xl font-heading text-5xl leading-[1] text-dc-white sm:text-7xl">
              Pernikahan Indonesia yang <span className="dc-em-light">nyata dan bisa ditiru</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-dc-white/85">
              Kurasi langsung dari{" "}
              <a
                href={PINTEREST_BOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-dc-white underline underline-offset-4 hover:text-dc-gold-antique focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-white"
              >
                papan Pinterest resmi DuaCincin
              </a>
              . Foto di galeri ini dari pernikahan sungguhan.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-12 sm:px-6 lg:px-10 lg:pt-16">
          {loading && (
            <div role="status" aria-label="Memuat inspirasi" className="columns-2 gap-4 lg:columns-3 xl:columns-4">
              {[60, 85, 70, 95, 65, 80, 100, 72].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h * 3}px` }}
                  className="mb-4 break-inside-avoid animate-pulse rounded-lg bg-dc-ink/10 motion-reduce:animate-none"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="flex flex-col items-center rounded-lg border border-dc-ink/10 bg-dc-white px-6 py-14 text-center">
              <p className="font-heading text-2xl text-dc-ink">Galeri belum bisa dimuat</p>
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

          {!loading && !error && items.length === 0 && (
            <EmptyState
              title="Belum ada inspirasi"
              body="Sambil menunggu, lihat papan Pinterest kami langsung."
              actionHref={PINTEREST_BOARD_URL}
              actionLabel="Buka papan Pinterest"
            />
          )}

          {!loading && !error && items.length > 0 && (
            <div className="columns-2 gap-4 lg:columns-3 xl:columns-4">
              {items.map((item) => (
                <PinterestImageCard
                  key={item.id}
                  imageUrl={item.url}
                  pinUrl={item.source_url || PINTEREST_BOARD_URL}
                  alt={item.alt_text || item.caption || "Inspirasi pernikahan"}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
