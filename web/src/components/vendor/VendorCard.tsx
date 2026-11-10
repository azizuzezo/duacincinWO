import Image from "next/image";
import Link from "next/link";

import { categoryLabel, formatRupiah, type DirectoryCard } from "@/lib/api";

const RATING = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** The one vendor card, shared by the directory and the /kategori pages.
 * Photo first: the portfolio sells, the text confirms. Only shows what the API
 * returns: price is the vendor's own price_min, and the rating appears only
 * when review_count > 0 (reviews come from completed bookings, so the number
 * is verified). "Bayar lewat escrow" is true for every booking made on
 * DuaCincin, so it sits on every card as a solid chip on the photo.
 * `horizontal` is the wide list layout (photo left from `sm`). */
export function VendorCard({ card, horizontal = false }: { card: DirectoryCard; horizontal?: boolean }) {
  const hasPrice = card.price_min > 0;
  const hasRating = card.review_count > 0;
  return (
    <Link
      href={`/vendors/${card.id}`}
      className={`group flex h-full overflow-hidden rounded-xl border border-dc-line bg-dc-white shadow-soft transition-[transform,box-shadow,border-color] duration-500 ease-dc hover:border-dc-line-strong hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold motion-safe:hover:-translate-y-1 ${
        horizontal ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      <div className={`relative overflow-hidden bg-dc-cream ${horizontal ? "aspect-4/3 sm:aspect-auto sm:w-[55%] sm:shrink-0" : "aspect-4/3"}`}>
        {card.sample_image ? (
          <Image
            src={card.sample_image}
            alt={`Portofolio ${card.business_name}`}
            fill
            sizes={horizontal ? "(min-width: 640px) 420px, 100vw" : "(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"}
            unoptimized
            className="object-cover transition-transform duration-700 ease-dc group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-dc-text-3">
            <svg aria-hidden viewBox="0 0 64 40" fill="none" className="h-8 w-12 text-dc-gold">
              <circle cx="24" cy="20" r="16" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="40" cy="20" r="16" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Belum ada foto
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-dc-ink/85 px-3 py-1 text-xs font-semibold text-dc-on-dark">
          {categoryLabel(card.category)}
        </span>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-dc-white px-2.5 py-1 text-xs font-semibold text-dc-ink shadow-soft">
          <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dc-clay">
            <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Bayar lewat escrow
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-heading text-[1.6rem] font-semibold leading-[1.1] text-dc-ink transition-colors group-hover:text-dc-clay">
            {card.business_name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-dc-text-2">
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-dc-clay">
              <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            {card.city}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-dc-line pt-4">
          <div>
            {hasPrice ? (
              <>
                <p className="text-xs text-dc-text-3">Mulai dari</p>
                <p className="text-lg font-bold leading-tight tabular-nums text-dc-ink">{formatRupiah(card.price_min)}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-dc-text-3">Harga</p>
                <p className="text-base font-semibold leading-tight text-dc-ink">Tanya lewat chat</p>
              </>
            )}
          </div>
          {hasRating ? (
            <p className="flex items-center gap-1 text-sm tabular-nums text-dc-ink">
              <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" className="text-dc-gold">
                <path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z" />
              </svg>
              <span className="font-bold">{RATING.format(card.average_rating)}</span>
              <span className="text-dc-text-3">({card.review_count} ulasan)</span>
            </p>
          ) : (
            <p className="text-sm text-dc-text-3">Belum ada ulasan</p>
          )}
        </div>
      </div>
    </Link>
  );
}
