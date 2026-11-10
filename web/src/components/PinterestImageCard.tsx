"use client";

import { motion } from "framer-motion";
import { useState } from "react";

/** Pinterest's "P" mark, used only next to the credit link back to the pin. */
export function PinterestMark({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-.94-.11-2.38.02-3.4.12-.94.79-6 .79-6s-.2-.4-.2-1c0-.94.55-1.64 1.23-1.64.58 0 .86.44.86.96 0 .59-.37 1.46-.57 2.28-.16.68.34 1.24 1.02 1.24 1.22 0 2.05-1.57 2.05-3.42 0-1.41-.95-2.46-2.68-2.46-1.95 0-3.17 1.46-3.17 3.09 0 .56.16.96.42 1.27.12.14.13.2.09.36l-.15.6c-.05.19-.19.24-.44.14-1.22-.5-1.79-1.83-1.79-3.33 0-2.48 2.09-5.45 6.24-5.45 3.33 0 5.52 2.41 5.52 5 0 3.42-1.9 5.98-4.7 5.98-.94 0-1.82-.5-2.12-1.08l-.6 2.36c-.19.72-.55 1.62-.84 2.19A12 12 0 1 0 12 0Z" />
    </svg>
  );
}

/**
 * A real Pinterest pin's image, in our own card styling (not Pinterest's
 * embed widget): full layout control and one consistent credit treatment.
 * Every card credits and links back to the source pin; the credit link is
 * always visible (touch and keyboard users have no hover).
 * With `onOpen`, the photo is a button that opens the gallery lightbox; the
 * shared `layoutId` lets the photo grow into the lightbox (purpose: the
 * viewer keeps their place, the picture they tapped is the one that opens).
 */
export function PinterestImageCard({
  imageUrl,
  pinUrl,
  alt = "Inspirasi pernikahan dari Pinterest",
  caption,
  tags,
  onOpen,
  layoutId,
}: {
  imageUrl: string;
  pinUrl: string;
  alt?: string;
  caption?: string;
  /** Short labels shown over the photo (e.g. adat). */
  tags?: string[];
  onOpen?: () => void;
  layoutId?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  const img = broken ? (
    <div className="flex aspect-[4/5] items-center justify-center bg-dc-cream px-6 text-center text-sm text-dc-text-3">Foto ini belum bisa dimuat</div>
  ) : (
    <motion.img
      layoutId={layoutId}
      src={imageUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
      className={`block min-h-24 w-full bg-dc-cream transition-[opacity,transform] duration-700 ease-dc group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );

  return (
    <figure className="group overflow-hidden rounded-xl border border-dc-line bg-dc-white shadow-soft transition-[box-shadow,transform] duration-500 ease-dc hover:shadow-lift motion-safe:hover:-translate-y-1">
      <div className="relative overflow-hidden bg-dc-cream">
        {onOpen && !broken ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Perbesar foto: ${alt}`}
            className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-dc-gold"
          >
            {img}
          </button>
        ) : (
          img
        )}
        {tags && tags.length > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-dc-ink/75 px-2.5 py-1 text-xs font-semibold text-dc-on-dark backdrop-blur-[2px]">
                {t}
              </span>
            ))}
          </span>
        )}
      </div>
      <figcaption className="flex items-start justify-between gap-3 px-3 pb-1 pt-2 sm:px-4 sm:pt-3">
        {/* Phones get two narrow columns: the caption lives in the lightbox there,
            the card keeps only the photo and its credit. */}
        {caption ? <p className="hidden pt-0.5 text-sm leading-snug text-dc-text-2 sm:line-clamp-2">{caption}</p> : <span />}
        <a
          href={pinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Lihat di Pinterest${caption ? `: ${caption}` : ""} (tab baru)`}
          className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold text-dc-text-3 transition-colors hover:text-dc-clay"
        >
          <PinterestMark />
          {!caption && <span>Lihat di Pinterest</span>}
        </a>
      </figcaption>
    </figure>
  );
}
