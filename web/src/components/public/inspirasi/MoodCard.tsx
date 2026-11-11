"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { PinterestMark } from "@/components/PinterestImageCard";

/** The API does not send image sizes, so every tile gets a stable ratio from
 * its position: the board still reads as a varied mood board, and the box is
 * the same size before and after the photo loads (no layout shift). The photo
 * fills it with object-cover. Skeletons use the same pattern. */
export const MOOD_RATIOS = ["4 / 5", "3 / 4", "1 / 1", "2 / 3", "4 / 5", "5 / 6"] as const;
export const moodRatio = (i: number) => MOOD_RATIOS[i % MOOD_RATIOS.length];

/** One photo on the mood board. The photo is a button that opens the
 * lightbox; it shares a layoutId with the lightbox image so the picture that
 * was tapped is the one that grows. Motion purpose: hover lifts the print a
 * little and the photo leans in (depth), the photo fades in when loaded. */
export function MoodCard({
  src,
  alt,
  caption,
  tags,
  pinUrl,
  ratio,
  layoutId,
  onOpen,
}: {
  src: string;
  alt: string;
  caption?: string;
  tags: string[];
  pinUrl: string;
  ratio: string;
  layoutId?: string;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A cached photo can finish before React attaches onLoad: check once on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) {
      if (img.naturalWidth > 0) setLoaded(true);
      else setBroken(true);
    }
  }, []);

  return (
    <figure className="group relative overflow-hidden rounded-2xl bg-dc-paper-3 shadow-soft transition-[box-shadow,transform] duration-500 ease-dc hover:shadow-lift motion-safe:hover:-translate-y-1">
      <div className="relative" style={{ aspectRatio: ratio }}>
        {broken ? (
          <div className="absolute inset-0 flex items-center justify-center bg-dc-cream px-6 text-center text-sm text-dc-text-2">Foto ini belum bisa dimuat</div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Perbesar foto: ${alt}`}
            className="absolute inset-0 block cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-dc-gold"
          >
            {!loaded && <span aria-hidden className="dc-skeleton absolute inset-0" />}
            <motion.img
              ref={imgRef}
              layoutId={layoutId}
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-dc group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          </button>
        )}
        {tags.length > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-dc-ink/80 px-2.5 py-1 text-xs font-semibold text-dc-on-dark">
                {t}
              </span>
            ))}
          </span>
        )}
        {/* Caption rises over the photo on hover (desktop); phones read it in the lightbox. */}
        {caption && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 bg-gradient-to-t from-dc-ink/90 via-dc-ink/60 to-transparent px-4 pb-4 pt-12 opacity-0 invisible transition-[opacity,transform,visibility] duration-500 ease-dc group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 lg:block">
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-dc-on-dark">{caption}</span>
          </span>
        )}
      </div>
      <a
        href={pinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Lihat di Pinterest${caption ? `: ${caption}` : ""} (tab baru)`}
        className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-dc-white/90 text-dc-ink shadow-soft transition-[opacity,transform] duration-300 hover:text-dc-clay focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <PinterestMark />
      </a>
    </figure>
  );
}
