import Image from "next/image";
import Link from "next/link";

import { categoryLabel, formatRupiah, type DirectoryCard } from "@/lib/api";

/** The one vendor card, shared by the directory, wizard results, and consultant
 * recommendations. Only shows what the API actually returns: price is the
 * vendor's own price_min, and rating appears only when review_count > 0
 * (reviews are tied to completed bookings, so it is a verified number).
 * `horizontal` is the desktop list layout; vertical is the grid/mobile one. */
export function VendorCard({ card, horizontal = false }: { card: DirectoryCard; horizontal?: boolean }) {
  const hasPrice = card.price_min > 0;
  return (
    <Link
      href={`/vendors/${card.id}`}
      className={`group flex h-full overflow-hidden rounded-lg border border-dc-ink/10 bg-dc-white transition-colors hover:border-dc-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
        horizontal ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      <div className={`relative bg-dc-cream ${horizontal ? "aspect-4/3 sm:aspect-auto sm:w-[55%] sm:shrink-0" : "aspect-4/3"}`}>
        {card.sample_image ? (
          <Image
            src={card.sample_image}
            alt={`Portofolio ${card.business_name}`}
            fill
            sizes={horizontal ? "(min-width: 640px) 420px, 100vw" : "(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"}
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-dc-black/60">Belum ada foto</div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-sm text-dc-clay">{categoryLabel(card.category)}</p>
          <h3 className="font-heading mt-0.5 text-2xl leading-tight text-dc-ink">{card.business_name}</h3>
          <p className="mt-1 text-sm text-dc-black/70">{card.city}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-dc-ink/10 pt-3">
          <div>
            {hasPrice ? (
              <>
                <p className="text-xs text-dc-black/70">Mulai dari</p>
                <p className="font-sans text-base font-semibold tabular-nums text-dc-ink">{formatRupiah(card.price_min)}</p>
              </>
            ) : (
              <p className="text-sm text-dc-black/70">Harga lewat diskusi</p>
            )}
          </div>
          <div className="text-right">
            {card.review_count > 0 && (
              <p className="text-sm tabular-nums text-dc-ink">
                {card.average_rating.toFixed(1)} <span className="text-dc-black/70">({card.review_count} ulasan)</span>
              </p>
            )}
            <p className="text-xs text-dc-black/70">Bayar lewat escrow</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
