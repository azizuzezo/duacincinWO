"use client";

// A first look at the curated inspiration gallery as a mood wall: the real
// items from the public gallery endpoint, in columns wider than the screen
// that drift at different speeds while you scroll, fading into a button that
// opens /inspirasi (full gallery, filters, lightbox, source links). When the
// gallery has fewer photos than the wall needs, the same real photos repeat
// in a shifted order (no stand-in pictures). Not rendered when the gallery is
// empty or unavailable.
//
// Motion purpose: columns drift against each other (a wall you move past, not
// a grid), tiles lift and the photo leans in on hover (it opens). Reduced
// motion: still columns.
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { useInspiration } from "@/components/landing/useHomeData";
import { buttonClasses } from "@/components/ui/Button";
import type { InspirationItem } from "@/lib/api";
import { useReducedMotion } from "@/lib/motion";

const COLS = 5;
const PER_COL = 3;
const SPEED = [-60, 50, -90, 40, -70];

function Tile({ item }: { item: InspirationItem }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  const label = item.caption || item.alt_text || "Inspirasi pernikahan";
  return (
    <Link
      href="/inspirasi"
      aria-label={`${label}, buka galeri inspirasi`}
      className="group block overflow-hidden rounded-xl bg-dc-cream shadow-soft transition-[transform,box-shadow] duration-500 ease-dc hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold motion-safe:hover:-translate-y-1"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote gallery images of unknown size; the gallery page renders them the same way */}
      <img
        src={item.url}
        alt={item.alt_text || label}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className="block min-h-24 w-full transition-transform duration-[1.1s] ease-dc group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    </Link>
  );
}

function Column({ items, speed, progress, className }: { items: InspirationItem[]; speed: number; progress: MotionValue<number>; className: string }) {
  const y = useTransform(progress, [0, 1], [0, -Math.abs(speed) * 2]);
  return (
    <motion.ul style={{ y }} className={`flex flex-1 flex-col gap-3 sm:gap-4 ${className}`}>
      {items.map((item, i) => (
        <li key={`${item.id}-${i}`}>
          <Tile item={item} />
        </li>
      ))}
    </motion.ul>
  );
}

export function InspirationTeaser() {
  const gallery = useInspiration();
  if (gallery.status !== "ready") return null;
  const items = (gallery.data ?? []).filter((i) => i.url);
  if (items.length === 0) return null;
  return <Wall items={items} />;
}

function Wall({ items }: { items: InspirationItem[] }) {
  const reduced = useReducedMotion();
  const wall = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wall, offset: ["start end", "end start"] });
  const still = useTransform(scrollYProgress, () => 0);

  // Deal photos into columns, cycling (shifted per column) only when needed.
  const total = Math.max(items.length, COLS * PER_COL);
  const cols: InspirationItem[][] = Array.from({ length: COLS }, () => []);
  for (let k = 0; k < total; k++) cols[k % COLS].push(items[(k + Math.floor(k / COLS)) % items.length]);

  return (
    <section aria-labelledby="inspirasi-judul" className="relative overflow-hidden bg-dc-white pt-20 sm:pt-28">
      <Reveal className="dc-container text-center">
        <p className="dc-eyebrow justify-center">Galeri inspirasi</p>
        <h2 id="inspirasi-judul" className="mx-auto mt-4 max-w-3xl font-heading text-[clamp(2.5rem,5.4vw,4.6rem)] leading-[1] text-dc-ink">
          Simpan idenya, <span className="dc-em">cari vendornya nanti.</span>
        </h2>
      </Reveal>

      <div ref={wall} className="relative mt-12 h-[460px] overflow-hidden sm:h-[680px] lg:h-[760px]">
        <div className="absolute left-1/2 top-0 flex w-[118vw] -translate-x-1/2 gap-3 sm:gap-4 lg:w-[108vw]">
          {cols.map((col, i) => (
            <Column key={i} items={col} speed={SPEED[i]} progress={reduced ? still : scrollYProgress} className={i >= 3 ? "hidden lg:flex" : ""} />
          ))}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-dc-white via-dc-white/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-10 flex justify-center">
          <Link href="/inspirasi" className={buttonClasses({ variant: "primary", size: "lg" })}>
            Buka galeri inspirasi
          </Link>
        </div>
      </div>
    </section>
  );
}
