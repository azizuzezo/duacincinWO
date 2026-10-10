import Link from "next/link";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { VendorCard } from "@/components/vendor/VendorCard";
import { categoryLabel, type DirectoryCard } from "@/lib/api";
import { citySlug } from "@/lib/server-api";

const HERO_BY_CATEGORY: Record<string, string> = {
  venue: "/stock/ballroom.webp",
  decor: "/stock/stairs-flowers.webp",
  photo_video: "/stock/photographer.webp",
  mua_attire: "/stock/couple-studio.webp",
  entertainment: "/stock/chandelier.webp",
};

/** Server-rendered listing for /kategori/[kategori] and /kategori/[kategori]/[kota]:
 * crawlable HTML for "vendor <kategori> <kota>" searches. */
export function CategoryListing({
  category,
  cityName,
  cards,
  failed,
}: {
  category: string;
  cityName?: string;
  cards: DirectoryCard[];
  failed: boolean;
}) {
  const label = categoryLabel(category);
  const cities = Array.from(new Set(cards.map((c) => c.city).filter(Boolean))).sort();
  return (
    <PublicShell>
      <PageHero
        image={HERO_BY_CATEGORY[category] ?? "/stock/hero-reception.webp"}
        title={
          <>
            Vendor {label} {cityName ? <span className="dc-em-light">di {cityName}</span> : <span className="dc-em-light">terverifikasi</span>}
          </>
        }
        subtitle="Portofolio, harga mulai dari, dan ulasan dari booking yang sudah selesai. Bayar lewat escrow DuaCincin."
      />
      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <nav aria-label="Jalur halaman" className="text-sm text-dc-black/70">
          <Link href="/vendors" className="text-dc-clay underline underline-offset-4 hover:text-dc-ink">
            Semua vendor
          </Link>
          <span aria-hidden> / </span>
          {cityName ? (
            <>
              <Link href={`/kategori/${category}`} className="text-dc-clay underline underline-offset-4 hover:text-dc-ink">
                {label}
              </Link>
              <span aria-hidden> / </span>
              <span>{cityName}</span>
            </>
          ) : (
            <span>{label}</span>
          )}
        </nav>

        {!cityName && cities.length > 1 && (
          <ul aria-label="Kota" className="mt-6 flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c}>
                <Link
                  href={`/kategori/${category}/${citySlug(c)}`}
                  className="inline-flex min-h-11 items-center rounded-md border border-dc-ink/20 px-4 text-sm text-dc-ink transition-colors hover:border-dc-ink hover:bg-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          {failed ? (
            <div role="alert" className="rounded-lg border border-dc-ink/10 bg-dc-white px-6 py-14 text-center">
              <p className="font-heading text-2xl text-dc-ink">Daftar vendor belum bisa dimuat</p>
              <p className="mt-2 text-sm text-dc-black/70">Muat ulang halaman ini sebentar lagi, atau buka direktori lengkap.</p>
              <Link
                href="/vendors"
                className="mt-6 inline-flex min-h-11 items-center rounded-md bg-dc-ink px-5 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay"
              >
                Buka direktori
              </Link>
            </div>
          ) : cards.length === 0 ? (
            <EmptyState
              title={`Belum ada vendor ${label}${cityName ? ` di ${cityName}` : ""}`}
              body="Coba kota atau kategori lain, atau kembali lagi saat vendor baru bergabung."
              actionHref="/vendors"
              actionLabel="Lihat semua vendor"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => (
                <li key={c.id}>
                  <VendorCard card={c} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
