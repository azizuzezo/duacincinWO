"use client";

// Vendor card + horizontal rail shared by the home page vendor rows.
// Card content follows the directory rules: price only when the vendor set
// one, rating only when there are reviews (reviews come from completed
// bookings), the escrow chip on every card (true for every booking).
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, type ReactNode } from "react";

import { categoryLabel, formatRupiah, type DirectoryCard } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { RailArrows } from "./RailArrows";
import { SectionHead, SeeAll, Shield, Star } from "./ui";
import { useDragScroll } from "./useDragScroll";

const RATING = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function rankVendors(cards: DirectoryCard[]) {
  return [...cards].sort(
    (a, b) => b.review_count - a.review_count || b.average_rating - a.average_rating || Number(!!b.sample_image) - Number(!!a.sample_image),
  );
}

export function VendorCard({ card }: { card: DirectoryCard }) {
  return (
    <Link href={`/vendors/${card.id}`} className="group block h-full rounded-[14px]">
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[14px] bg-wd-blush">
        {card.sample_image ? (
          <Image
            src={card.sample_image}
            alt={`Portofolio ${card.business_name}`}
            fill
            unoptimized
            sizes="(min-width: 1024px) 240px, 70vw"
            className="object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-wd-muted">Belum ada foto</span>
        )}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[0.72rem] font-semibold text-wd-ink">
          <Shield size={11} className="text-wd-accent-ink" />
          Escrow
        </span>
        {/* Hover / focus reveal: says what the click does. */}
        <span
          aria-hidden
          className="absolute inset-x-2.5 bottom-2.5 flex translate-y-2 items-center justify-center rounded-full bg-white/95 py-2 text-[0.8rem] font-semibold text-wd-ink opacity-0 shadow-wd-card transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          Lihat profil
        </span>
      </span>
      <span className="block pt-3">
        <span className="line-clamp-2 break-words text-[1rem] font-semibold leading-snug text-wd-ink transition-colors group-hover:text-wd-accent-ink">{card.business_name}</span>
        <span className="mt-1 block truncate text-[0.85rem] text-wd-muted">
          {categoryLabel(card.category)} · {card.city}
        </span>
        {card.review_count > 0 && (
          <span className="mt-1.5 flex items-center gap-1 text-[0.85rem]">
            <span className="flex text-wd-gold">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={13} className={i < Math.round(card.average_rating) ? "" : "opacity-30"} />
              ))}
            </span>
            <span className="font-semibold tabular-nums text-wd-ink">{RATING.format(card.average_rating)}</span>
            <span className="text-wd-muted">({card.review_count})</span>
          </span>
        )}
        <span className="mt-1.5 block text-[0.85rem] text-wd-text">
          {card.price_min > 0 ? (
            <>
              Mulai <span className="font-semibold tabular-nums text-wd-ink">{formatRupiah(card.price_min)}</span>
            </>
          ) : (
            "Tanya harga lewat chat"
          )}
        </span>
      </span>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div aria-hidden>
      <div className="aspect-[4/3] animate-pulse rounded-[14px] bg-wd-blush" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-wd-blush" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-wd-blush" />
    </div>
  );
}

const ITEM = "w-[62vw] max-w-[260px] shrink-0 sm:w-[calc((100%-3*16px)/3.3)] lg:w-[calc((100%-4*20px)/5)] lg:max-w-none";

/** A titled row of vendors: heading with "see all" and prev/next on the
 * right, optional controls (chips) under it, then five cards per row on
 * desktop, swipeable everywhere. */
export function VendorRail({
  id,
  title,
  sub,
  seeAll,
  as,
  cards,
  loading,
  children,
}: {
  id: string;
  title: ReactNode;
  sub?: ReactNode;
  seeAll: { href: string; label: string };
  as?: "h1" | "h2";
  cards: DirectoryCard[];
  loading?: boolean;
  children?: ReactNode;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  useDragScroll(rail);
  return (
    <>
      <SectionHead
        id={id}
        as={as}
        title={title}
        sub={sub}
        action={
          <div className="flex items-center gap-4">
            <SeeAll href={seeAll.href}>{seeAll.label}</SeeAll>
            {!loading && cards.length > 5 && (
              <div className="hidden lg:block">
                <RailArrows rail={rail} label="Vendor" />
              </div>
            )}
          </div>
        }
      />
      {children}
      <ul ref={rail} aria-labelledby={id} className="wd-rail -mx-1 mt-6 flex gap-4 overflow-x-auto px-1 pb-2 lg:gap-5">
        {loading ? (
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className={ITEM}>
              <SkeletonCard />
            </li>
          ))
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {cards.map((c, i) => (
              <motion.li
                key={c.id}
                className={ITEM}
                layout={!reduced}
                initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: reduced ? 0 : Math.min(i, 5) * 0.04, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <VendorCard card={c} />
              </motion.li>
            ))}
          </AnimatePresence>
        )}
      </ul>
    </>
  );
}
