"use client";

// The curated inspiration gallery as a soft masonry wall with category
// chips. Hovering a photo shows its caption and the vendors who worked on
// it (tagged by Admin); clicking opens the gallery lightbox (arrows, swipe,
// Escape, vendor links) shared with /inspirasi. Loading: skeleton tiles. Failed: a retry panel.
// An empty gallery hides the section (nothing to show, nothing invented).
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { shortCaption } from "@/components/public/inspirasi/caption";
import { Lightbox } from "@/components/public/inspirasi/Lightbox";
import { useInspiration } from "@/components/landing/useHomeData";
import { categoryLabel, type InspirationItem } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { LoadError, SectionHead, SeeAll } from "./ui";

const MAX = 10;

function Tile({ item, onOpen }: { item: InspirationItem; onOpen: () => void }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  const label = shortCaption(item.caption || item.alt_text);
  const vendor = item.vendors?.[0];
  return (
    <li>
    <button type="button" onClick={onOpen} aria-label={`Lihat foto: ${label}`} className="group relative block w-full overflow-hidden rounded-[16px] bg-wd-blush text-left">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote gallery images of unknown size, rendered like /inspirasi */}
      <img
        src={item.url}
        alt={item.alt_text || label}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className="block min-h-24 w-full transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-2 [@media(hover:hover)]:block rounded-2xl bg-white/95 p-3 opacity-0 shadow-wd-card backdrop-blur transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <span className="line-clamp-2 text-sm font-medium leading-snug text-wd-ink">{label}</span>
        {vendor && <span className="mt-1 block truncate text-xs text-wd-muted">oleh {vendor.business_name}</span>}
      </span>
    </button>
    </li>
  );
}

export function Inspiration() {
  const gallery = useInspiration();
  const reduced = useReducedMotion();
  const [cat, setCat] = useState("");
  // Index of the photo open in the lightbox (null = closed).
  const [open, setOpen] = useState<number | null>(null);
  const items = useMemo(() => (gallery.status === "ready" ? (gallery.data ?? []).filter((i) => i.url) : []), [gallery]);
  const cats = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].slice(0, 5), [items]);
  if (gallery.status === "ready" && items.length === 0) return null;
  const shown = (cat ? items.filter((i) => i.category === cat) : items).slice(0, MAX);

  return (
    <section aria-labelledby="inspirasi-judul" className="bg-white py-10 sm:py-14">
      <div className="wd-container">
        <Reveal>
          <SectionHead
            id="inspirasi-judul"
            title="Inspirasi pernikahan"
            sub="Dari pernikahan sungguhan, lengkap dengan vendornya."
            action={<SeeAll href="/inspirasi">Buka galeri</SeeAll>}
          />
        </Reveal>

        {cats.length > 1 && (
          <div className="wd-rail -mx-1 mt-8 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Saring inspirasi">
            {[{ v: "", l: "Semua" }, ...cats.map((c) => ({ v: c, l: categoryLabel(c) }))].map((c) => (
              <button
                key={c.v || "semua"}
                type="button"
                aria-pressed={cat === c.v}
                onClick={() => setCat(c.v)}
                className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-wd-line px-4 text-sm font-medium text-wd-text transition-colors hover:border-wd-ink aria-pressed:border-wd-accent aria-pressed:bg-wd-accent-soft aria-pressed:text-wd-accent-ink"
              >
                {c.l}
              </button>
            ))}
          </div>
        )}

        {gallery.status === "loading" && (
          <ul aria-hidden className="mt-8 columns-2 gap-4 sm:columns-3 lg:columns-5 [&>li]:mb-4">
            {[260, 200, 300, 220, 280, 240, 200, 260, 300, 220].map((h, i) => (
              <li key={i} className="animate-pulse rounded-[20px] bg-wd-blush" style={{ height: h }} />
            ))}
          </ul>
        )}
        {gallery.status === "error" && (
          <div className="mt-8">
            <LoadError what="Galeri inspirasi" onRetry={gallery.retry} href="/inspirasi" hrefLabel="Buka galeri" />
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={cat}
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-8 columns-2 gap-4 sm:columns-3 lg:columns-5 [&>li]:mb-4 [&>li]:break-inside-avoid"
          >
            {shown.map((item, i) => (
              <Tile key={item.id} item={item} onOpen={() => setOpen(i)} />
            ))}
          </motion.ul>
        </AnimatePresence>
        {open !== null && shown[open] && <Lightbox items={shown} index={open} sharedId={null} onClose={() => setOpen(null)} onMove={setOpen} />}
      </div>
    </section>
  );
}
