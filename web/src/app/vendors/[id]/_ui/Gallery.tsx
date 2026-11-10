"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { EASE, useReducedMotion } from "@/lib/motion";

export type PortfolioItem = { id: string; url: string; alt_text: string };

const alt = (p: PortfolioItem) => p.alt_text || "Portofolio vendor";

/** Desktop mosaic: the first photo leads (the vendor's cover), the next ones
 * sit beside it. The grid shape adapts to how many photos exist so one or
 * two photos never leave empty holes. */
function mosaic(n: number): { grid: string; tiles: string[] } {
  if (n === 1) return { grid: "grid-cols-1", tiles: ["aspect-[21/9]"] };
  if (n === 2) return { grid: "grid-cols-2", tiles: ["aspect-[4/3]", "aspect-[4/3]"] };
  if (n === 3) return { grid: "grid-cols-3 grid-rows-2 h-[min(60vh,540px)]", tiles: ["col-span-2 row-span-2", "", ""] };
  if (n === 4) return { grid: "grid-cols-4 grid-rows-2 h-[min(60vh,540px)]", tiles: ["col-span-2 row-span-2", "col-span-2", "", ""] };
  return { grid: "grid-cols-4 grid-rows-2 h-[min(62vh,560px)]", tiles: ["col-span-2 row-span-2", "", "", "", ""] };
}

export function Gallery({ items, onOpen }: { items: PortfolioItem[]; onOpen: (i: number) => void }) {
  const shown = items.slice(0, 5);
  const { grid, tiles } = mosaic(shown.length);
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = track.current;
    if (!el || !el.firstElementChild) return;
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 12;
    setSlide(Math.min(items.length - 1, Math.round(el.scrollLeft / w)));
  }

  return (
    <div className="relative">
      {/* Mobile: swipeable full-bleed strip, every photo reachable with a thumb. */}
      <div className="relative -mx-4 sm:-mx-6 md:hidden">
        <div
          ref={track}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6"
          aria-label="Foto portofolio, geser untuk melihat"
          role="group"
        >
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`Perbesar foto ${i + 1} dari ${items.length}: ${alt(p)}`}
              className={`relative aspect-[4/5] shrink-0 snap-center overflow-hidden rounded-2xl bg-dc-cream focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-dc-gold ${items.length === 1 ? "w-full" : "w-[86%]"}`}
            >
              <Image src={p.url} alt={alt(p)} fill priority={i === 0} sizes="90vw" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
        {items.length > 1 && (
          <p className="pointer-events-none absolute bottom-3 right-7 rounded-full bg-dc-ink/75 px-3 py-1 text-xs font-semibold tabular-nums text-dc-on-dark" aria-hidden>
            {slide + 1} / {items.length}
          </p>
        )}
      </div>

      {/* Desktop and tablet: mosaic, cover photo first. */}
      <div className={`hidden gap-3 md:grid ${grid}`}>
        {shown.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Perbesar foto ${i + 1} dari ${items.length}: ${alt(p)}`}
            className={`group relative min-h-0 overflow-hidden bg-dc-cream focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold ${tiles[i]} ${
              i === 0 ? "rounded-2xl" : "rounded-xl"
            }`}
          >
            <Image
              src={p.url}
              alt={alt(p)}
              fill
              priority={i === 0}
              sizes={i === 0 && shown.length > 2 ? "(min-width: 1240px) 620px, 50vw" : "(min-width: 1240px) 320px, 25vw"}
              className="object-cover transition-transform duration-700 ease-dc group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              unoptimized
            />
          </button>
        ))}
      </div>
      {items.length > 1 && (
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="absolute bottom-4 right-4 hidden min-h-11 items-center gap-2 rounded-full bg-dc-white/95 px-5 text-sm font-semibold text-dc-ink shadow-lift transition-colors hover:bg-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold md:inline-flex"
        >
          <svg aria-hidden width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" />
            <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" />
            <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" />
            <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" />
          </svg>
          Lihat semua {items.length} foto
        </button>
      )}
    </div>
  );
}

/** Full portfolio grid for the Portofolio tab. Natural photo order, every
 * tile opens the lightbox at that photo. */
export function PortfolioGrid({ items, onOpen }: { items: PortfolioItem[]; onOpen: (i: number) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((p, i) => (
        <li key={p.id} className={i % 5 === 0 && items.length > 2 ? "col-span-2 sm:col-span-1 sm:row-span-2" : ""}>
          <button
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Perbesar foto ${i + 1} dari ${items.length}: ${alt(p)}`}
            className="group relative block h-full min-h-40 w-full overflow-hidden rounded-xl bg-dc-cream focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold"
          >
            <span className={`block ${i % 5 === 0 && items.length > 2 ? "aspect-[4/3] sm:aspect-auto sm:h-full" : "aspect-square"}`} />
            <Image
              src={p.url}
              alt={alt(p)}
              fill
              sizes="(min-width: 640px) 280px, 50vw"
              className="object-cover transition-transform duration-700 ease-dc group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              unoptimized
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Full-screen viewer. Arrow keys / Home / End, swipe on touch, thumbnails,
 * Escape and focus trap (shared useFocusTrap). The photo crossfades so the
 * eye registers the change without a jarring cut. */
export function Lightbox({
  items,
  index,
  onChange,
  onClose,
}: {
  items: PortfolioItem[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const startX = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const item = items[index];
  const many = items.length > 1;
  const go = (i: number) => onChange((i + items.length) % items.length);

  useFocusTrap(true, ref, onClose);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "Home") onChange(0);
      else if (e.key === "End") onChange(items.length - 1);
      else return;
      e.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    thumbs.current[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
  }, [index, reduced]);

  const ctrl =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-dc-on-dark/10 text-dc-on-dark transition-colors hover:bg-dc-on-dark/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold-antique";

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Galeri portofolio" className="fixed inset-0 z-[80] flex flex-col bg-dc-ink text-dc-on-dark">
      <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <p className="min-w-0 truncate text-sm text-dc-on-dark/85" aria-live="polite">
          <span className="font-semibold tabular-nums text-dc-on-dark">
            {index + 1} / {items.length}
          </span>
          <span className="ml-3">{alt(item)}</span>
        </p>
        <button type="button" onClick={onClose} aria-label="Tutup galeri" className={ctrl}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center gap-2 px-2 sm:gap-4 sm:px-6"
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null || !many) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        {many && (
          <button type="button" onClick={() => go(index - 1)} aria-label="Foto sebelumnya" className={`${ctrl} hidden sm:flex`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
        )}
        <div className="relative h-full min-w-0 flex-1 touch-pan-y select-none">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={item.id}
              className="absolute inset-0"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: reduced ? 0.01 : 0.35, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: reduced ? 0.01 : 0.2 } }}
            >
              <Image src={item.url} alt={alt(item)} fill sizes="100vw" className="object-contain" draggable={false} unoptimized />
            </motion.div>
          </AnimatePresence>
        </div>
        {many && (
          <button type="button" onClick={() => go(index + 1)} aria-label="Foto berikutnya" className={`${ctrl} hidden sm:flex`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {many && (
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="mb-3 flex items-center justify-center gap-3 sm:hidden">
            <button type="button" onClick={() => go(index - 1)} aria-label="Foto sebelumnya" className={ctrl}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Foto berikutnya" className={ctrl}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex justify-center">
            <div className="flex max-w-full gap-2 overflow-x-auto p-1 [scrollbar-width:none]">
              {items.map((p, i) => (
                <button
                  key={p.id}
                  ref={(el) => {
                    thumbs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => onChange(i)}
                  aria-label={`Foto ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold-antique sm:h-16 sm:w-16 ${
                    i === index ? "opacity-100 ring-2 ring-dc-gold-antique" : "opacity-55 hover:opacity-90"
                  }`}
                >
                  <Image src={p.url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
