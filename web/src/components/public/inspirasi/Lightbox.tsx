"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PinterestMark } from "@/components/PinterestImageCard";
import { buttonClasses } from "@/components/ui/Button";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import type { InspirationItem } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { ADAT, adatOf, vendorCategory } from "./adat";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === "prev" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

/** Full-screen photo viewer for the gallery. Keyboard: arrows to move,
 * Escape to close, Tab stays inside. Touch: swipe left/right. The photo
 * shares a layoutId with its card so it grows out of the grid. */
export function Lightbox({
  items,
  index,
  sharedId,
  onClose,
  onMove,
}: {
  items: InspirationItem[];
  index: number;
  /** Only the photo that was tapped grows out of its card; the rest just fade. */
  sharedId: string | null;
  onClose: () => void;
  onMove: (next: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const item = items[index];
  const total = items.length;
  useFocusTrap(true, ref, onClose);

  // Direction of the last move: the next photo slides in from the side the
  // reader is heading to (spatial continuity), the old one leaves the other way.
  const [prevIndex, setPrevIndex] = useState(index);
  const [dir, setDir] = useState(0);
  if (prevIndex !== index) {
    const forward = (index - prevIndex + total) % total <= total / 2;
    setDir(forward ? 1 : -1);
    setPrevIndex(index);
  }

  // Warm the neighbours so a swipe never waits on the network.
  useEffect(() => {
    for (const n of [index - 1, index + 1]) {
      const it = items[(n + total) % total];
      if (it) new window.Image().src = it.url;
    }
  }, [index, items, total]);

  const prev = () => onMove((index - 1 + total) % total);
  const next = () => onMove((index + 1) % total);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") onMove((index - 1 + total) % total);
      if (e.key === "ArrowRight") onMove((index + 1) % total);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, total, onMove]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60) next();
    else if (info.offset.x > 60) prev();
  }

  const adat = adatOf(item).map((k) => ADAT.find((a) => a.key === k)!.label);
  const cat = vendorCategory(item.category);
  const title = item.caption || item.alt_text || "Inspirasi pernikahan";

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} dari ${total}: ${title}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.01 : 0.3, ease: EASE }}
      className="dc-on-dark fixed inset-0 z-[80] flex flex-col bg-dc-ink text-dc-on-dark lg:flex-row"
    >
      {/* One close control for every size, first in the tab order so the
          dialog opens with focus on it (a hidden duplicate cannot take focus). */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="absolute right-3 top-2 z-10 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-dc-on-dark transition-colors hover:bg-dc-on-dark/10 lg:right-8 lg:top-7 lg:border lg:border-dc-on-dark/25 lg:px-4 lg:hover:border-dc-on-dark"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className="lg:hidden">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        <span aria-hidden className="hidden lg:inline">
          Tutup <span className="text-xs text-dc-on-dark/70">Esc</span>
        </span>
      </button>
      <div className="flex min-h-14 items-center px-4 pt-3 lg:hidden">
        <p className="text-sm text-dc-on-dark/80" aria-live="polite">
          {index + 1} dari {total}
        </p>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-3 lg:px-20 lg:pb-28 lg:pt-10">
        <div className="relative h-full w-full">
          <AnimatePresence initial={false} custom={dir}>
            <motion.img
              key={item.id}
              custom={dir}
              layoutId={reduced || item.id !== sharedId ? undefined : `insp-${item.id}`}
              src={item.url}
              alt={item.alt_text || item.caption || "Inspirasi pernikahan"}
              variants={{
                enter: (d: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: d * 90, scale: 0.98 }),
                center: { opacity: 1, x: 0, scale: 1 },
                exit: (d: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: d * -90, scale: 0.98 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduced ? 0.15 : 0.45, ease: EASE }}
              drag={reduced ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.35}
              onDragEnd={onDragEnd}
              className="absolute inset-0 h-full w-full cursor-grab touch-pan-y select-none object-contain active:cursor-grabbing"
              draggable={false}
            />
          </AnimatePresence>
        </div>
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-dc-on-dark/25 bg-dc-ink/60 text-dc-on-dark transition-colors hover:border-dc-gold-antique hover:text-dc-gold-antique sm:inline-flex lg:left-6"
            >
              <Arrow dir="prev" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-dc-on-dark/25 bg-dc-ink/60 text-dc-on-dark transition-colors hover:border-dc-gold-antique hover:text-dc-gold-antique sm:inline-flex lg:right-6"
            >
              <Arrow dir="next" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <nav aria-label="Pilih foto" className="hidden lg:absolute lg:bottom-5 lg:left-20 lg:right-[340px] lg:flex lg:justify-center">
          <ul className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-dc-ink-2/90 p-2 [scrollbar-width:none]">
            {items.map((it, i) => (
              <li key={it.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onMove(i)}
                  aria-label={`Foto ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`relative block h-12 w-12 overflow-hidden rounded-lg transition-[opacity,box-shadow,transform] duration-300 active:scale-95 ${i === index ? "opacity-100 ring-2 ring-dc-gold-antique" : "opacity-55 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote pin thumbnails, same source as the gallery */}
                  <img src={it.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <aside className="shrink-0 border-t border-dc-ink-3 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 lg:flex lg:w-[340px] lg:flex-col lg:border-l lg:border-t-0 lg:px-8 lg:py-8">
        <p className="hidden min-h-11 items-center text-sm text-dc-on-dark/80 lg:flex" aria-live="polite">
          {index + 1} dari {total}
        </p>
        {(adat.length > 0 || cat) && (
          <p className="flex flex-wrap gap-1.5 lg:mt-10">
            {adat.map((a) => (
              <span key={a} className="rounded-full bg-dc-gold-antique/15 px-3 py-1 text-xs font-semibold text-dc-gold-antique">
                Adat {a}
              </span>
            ))}
            {cat && <span className="rounded-full bg-dc-on-dark/10 px-3 py-1 text-xs font-semibold text-dc-on-dark">{cat.label}</span>}
          </p>
        )}
        <p className="mt-3 line-clamp-3 font-heading text-2xl leading-snug text-dc-on-dark lg:mt-4 lg:line-clamp-none lg:text-[1.9rem]">{title}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 lg:mt-auto lg:flex-col lg:items-stretch">
          {cat && (
            <Link href={`/vendors?category=${cat.value}`} className={buttonClasses({ variant: "light", size: "sm" })}>
              Cari vendor {cat.label}
            </Link>
          )}
          <a
            href={item.source_url || PINTEREST_BOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "ghostLight", size: "sm" })}
          >
            <PinterestMark />
            Lihat di Pinterest
          </a>
        </div>
        {item.source_credit && <p className="mt-3 text-xs text-dc-on-dark/70">Foto: {item.source_credit}</p>}
      </aside>
    </motion.div>
  );
}
