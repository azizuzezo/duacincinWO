"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { EASE, useReducedMotion } from "@/lib/motion";

export type PortfolioItem = { id: string; url: string; alt_text: string };

const alt = (p: PortfolioItem) => p.alt_text || "Portofolio vendor";

const GRID_ICON = (
  <svg aria-hidden width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" />
    <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" />
  </svg>
);

/** Desktop mosaic, Bridestory style: the first photo (the vendor's cover)
 * leads on the left, four smaller ones fill a 2x2 block on the right. The
 * grid adapts to how many photos exist so one or two never leave holes. */
function mosaic(n: number): { grid: string; tiles: string[] } {
  if (n === 1) return { grid: "grid-cols-1 h-[min(56vh,480px)]", tiles: [""] };
  if (n === 2) return { grid: "grid-cols-2 h-[min(56vh,480px)]", tiles: ["", ""] };
  if (n === 3) return { grid: "grid-cols-3 grid-rows-2 h-[min(58vh,500px)]", tiles: ["col-span-2 row-span-2", "", ""] };
  if (n === 4) return { grid: "grid-cols-4 grid-rows-2 h-[min(58vh,500px)]", tiles: ["col-span-2 row-span-2", "col-span-2", "", ""] };
  return { grid: "grid-cols-4 grid-rows-2 h-[min(58vh,500px)]", tiles: ["col-span-2 row-span-2", "", "", "", ""] };
}

const tileFocus = "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white";

export function Gallery({ items, onOpen }: { items: PortfolioItem[]; onOpen: (i: number) => void }) {
  const shown = items.slice(0, 5);
  const { grid, tiles } = mosaic(shown.length);
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = track.current;
    if (!el || !el.firstElementChild) return;
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 8;
    setSlide(Math.min(items.length - 1, Math.round(el.scrollLeft / w)));
  }

  const seeAll = (
    <button
      type="button"
      onClick={() => onOpen(0)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-wd-line-2 bg-white px-4 text-sm font-semibold text-wd-ink shadow-wd-card transition-colors hover:border-wd-ink"
    >
      {GRID_ICON}
      Lihat semua foto ({items.length})
    </button>
  );

  return (
    <div className="relative">
      {/* Phones: swipeable full-bleed strip, every photo reachable with a thumb. */}
      <div className="relative -mx-4 md:hidden">
        <div
          ref={track}
          onScroll={onScroll}
          className="wd-rail flex gap-2 overflow-x-auto px-4"
          aria-label="Foto portofolio, geser untuk melihat"
          role="group"
        >
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`Perbesar foto ${i + 1} dari ${items.length}: ${alt(p)}`}
              className={`relative aspect-[4/3] shrink-0 overflow-hidden rounded-[14px] bg-wd-blush ${tileFocus} ${items.length === 1 ? "w-full" : "w-[88%]"}`}
            >
              <Image src={p.url} alt={alt(p)} fill priority={i === 0} sizes="90vw" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
        {items.length > 1 && (
          <p className="pointer-events-none absolute left-7 top-3 rounded-full bg-wd-ink/75 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white" aria-hidden>
            {slide + 1} / {items.length}
          </p>
        )}
        {items.length > 1 && <div className="absolute bottom-3 right-7">{seeAll}</div>}
      </div>

      {/* Tablet and desktop: mosaic, cover photo first. */}
      <div className={`group/m hidden gap-2 overflow-hidden rounded-[20px] md:grid ${grid}`}>
        {shown.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Perbesar foto ${i + 1} dari ${items.length}: ${alt(p)}`}
            className={`group relative min-h-0 overflow-hidden bg-wd-blush ${tileFocus} ${tiles[i]}`}
          >
            <Image
              src={p.url}
              alt={alt(p)}
              fill
              priority={i === 0}
              sizes={i === 0 && shown.length > 2 ? "(min-width: 1280px) 620px, 50vw" : "(min-width: 1280px) 310px, 25vw"}
              className="object-cover transition-[transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/m:brightness-[0.88] group-hover:!brightness-100 group-hover:scale-[1.03] group-focus-visible:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              unoptimized
            />
            {i === shown.length - 1 && items.length > shown.length && (
              <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-wd-ink/55 text-2xl font-semibold text-white transition-colors group-hover:bg-wd-ink/65">
                +{items.length - shown.length} foto
              </span>
            )}
          </button>
        ))}
      </div>
      {items.length > 1 && <div className="absolute bottom-4 right-4 hidden md:block">{seeAll}</div>}
    </div>
  );
}

/** Full portfolio grid for the Foto section. Natural photo order, every
 * tile opens the lightbox at that photo. */
export function PortfolioGrid({ items, onOpen }: { items: PortfolioItem[]; onOpen: (i: number) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {items.map((p, i) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Perbesar foto ${i + 1} dari ${items.length}: ${alt(p)}`}
            className={`group relative block aspect-square w-full overflow-hidden rounded-[14px] bg-wd-blush ${tileFocus}`}
          >
            <Image
              src={p.url}
              alt={alt(p)}
              fill
              sizes="(min-width: 640px) 260px, 50vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
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
  const reduced = useReducedMotion();
  const item = items[index];
  const many = items.length > 1;
  // +1 = moving forward (new photo comes from the right), -1 = back.
  const [dir, setDir] = useState(1);
  const go = (i: number) => {
    setDir(i < index ? -1 : 1);
    onChange((i + items.length) % items.length);
  };
  const jump = (i: number) => {
    setDir(i < index ? -1 : 1);
    onChange(i);
  };

  useFocusTrap(true, ref, onClose);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "Home") jump(0);
      else if (e.key === "End") jump(items.length - 1);
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
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-dc-on-dark/10 text-dc-on-dark transition-colors hover:bg-dc-on-dark/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent";

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

      <div className="relative flex min-h-0 flex-1 items-center gap-2 px-2 sm:gap-4 sm:px-6">
        {many && (
          <button type="button" onClick={() => go(index - 1)} aria-label="Foto sebelumnya" className={`${ctrl} hidden sm:flex`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
        )}
        <div className="relative h-full min-w-0 flex-1 touch-pan-y select-none">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            {/* The photo follows the finger (drag on x) and settles back
                unless the swipe is long or fast enough to change photo. */}
            <motion.div
              key={item.id}
              custom={dir}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              drag={many ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const swipe = info.offset.x + info.velocity.x * 0.2;
                if (swipe < -80) go(index + 1);
                else if (swipe > 80) go(index - 1);
              }}
              variants={{
                enter: (d: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: d * 60 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: d * -60 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduced ? 0.01 : 0.32, ease: EASE }}
            >
              <Image src={item.url} alt={alt(item)} fill sizes="100vw" className="pointer-events-none object-contain" draggable={false} unoptimized />
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
                  onClick={() => jump(i)}
                  aria-label={`Foto ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent sm:h-16 sm:w-16 ${
                    i === index ? "opacity-100 ring-2 ring-wd-accent" : "opacity-55 hover:opacity-90"
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
