"use client";

// Real vendors from the public directory as a big, photo-first rail that
// bleeds off the right edge (there is always more to see). Order: vendors with
// verified reviews first (more reviews, then higher rating), then with photos,
// so the rail opens on proof. If the directory fails or is empty the section
// is not rendered: no fake vendors. Card content follows VendorCard's rules:
// price only when the vendor set one, rating only when review_count > 0
// (reviews come from completed bookings), escrow chip on every card (true for
// every booking on DuaCincin).
//
// Motion purpose: native scroll-snap for thumbs and trackpads; with a mouse
// the rail can be dragged and keeps a little momentum (it behaves like the
// phone rail it looks like); arrows glide one card and dim at the ends; cards
// lift and their photo leans in on hover. Reduced motion: no glide, no zoom.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { useDirectory } from "@/components/landing/useHomeData";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { categoryLabel, formatRupiah, type DirectoryCard } from "@/lib/api";

const MAX = 10;
const RATING = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// Left edge of the rail = left edge of .dc-container content, so the first
// card lines up with the headline and the rest run to the screen edge.
const EDGE = "calc(max(0px, (100% - 1240px) / 2) + clamp(16px, 4vw, 48px))";

function rank(cards: DirectoryCard[]): DirectoryCard[] {
  return [...cards]
    .sort((a, b) => b.review_count - a.review_count || b.average_rating - a.average_rating || Number(!!b.sample_image) - Number(!!a.sample_image))
    .slice(0, MAX);
}

function RailCard({ card }: { card: DirectoryCard }) {
  return (
    <Link
      href={`/vendors/${card.id}`}
      draggable={false}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-dc-paper-3 shadow-soft transition-[transform,box-shadow] duration-500 ease-dc hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold active:scale-[0.985] motion-safe:hover:-translate-y-1.5"
    >
      {card.sample_image ? (
        <Image
          src={card.sample_image}
          alt={`Portofolio ${card.business_name}`}
          fill
          draggable={false}
          unoptimized
          sizes="(min-width: 1024px) 400px, 78vw"
          className="object-cover transition-transform duration-[1.1s] ease-dc group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div className="flex h-full items-center justify-center pb-24 text-sm text-dc-text-2">Belum ada foto</div>
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[72%] bg-linear-to-t from-dc-ink via-dc-ink/85 to-transparent" />
      <span className="absolute left-4 top-4 rounded-full bg-dc-ink/85 px-3 py-1 text-xs font-semibold text-dc-on-dark">{categoryLabel(card.category)}</span>
      <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-dc-white px-2.5 py-1 text-xs font-semibold text-dc-ink shadow-soft">
        <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dc-clay">
          <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        Escrow
      </span>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <h3 className="font-heading text-[1.85rem] font-semibold leading-[1.05] text-[#fbf6ec]">{card.business_name}</h3>
        <p className="mt-1 text-sm text-[#fbf6ec]">{card.city}</p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#fbf6ec]/25 pt-3">
          <p className="text-sm text-[#fbf6ec]">
            {card.price_min > 0 ? (
              <>
                Mulai <span className="text-base font-bold tabular-nums">{formatRupiah(card.price_min)}</span>
              </>
            ) : (
              <span className="font-semibold">Harga lewat chat</span>
            )}
          </p>
          {card.review_count > 0 && (
            <p className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-[#fbf6ec]">
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" className="text-dc-gold-antique">
                <path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z" />
              </svg>
              <span className="font-bold">{RATING.format(card.average_rating)}</span>
              <span>({card.review_count})</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function Arrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? "Vendor sebelumnya" : "Vendor berikutnya"}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-dc-ink/20 bg-dc-white text-dc-ink transition-[opacity,transform,background-color,color] duration-300 ease-dc hover:bg-dc-ink hover:text-dc-on-dark active:scale-90 disabled:pointer-events-none disabled:opacity-35"
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={dir < 0 ? "rotate-180" : ""}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}

export function FeaturedVendors() {
  const directory = useDirectory();
  const rail = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; left: number; t: number; vx: number; moved: boolean } | null>(null);

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  const cards = directory.status === "ready" ? rank(directory.data ?? []) : [];
  const ready = directory.status === "ready" && cards.length > 0;

  useEffect(() => {
    if (!ready) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ready, measure]);

  if (directory.status === "error" || (directory.status === "ready" && cards.length === 0)) return null;

  const reducedNow = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function glide(dir: -1 | 1) {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: reducedNow() ? "auto" : "smooth" });
  }

  // Mouse drag with momentum. Touch and pen keep native scrolling.
  function onDown(e: PointerEvent<HTMLUListElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0 || !rail.current) return;
    drag.current = { x: e.clientX, left: rail.current.scrollLeft, t: e.timeStamp, vx: 0, moved: false };
  }
  function onMove(e: PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    const el = rail.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    const prev = el.scrollLeft;
    el.scrollLeft = d.left - dx;
    const dt = Math.max(1, e.timeStamp - d.t);
    d.vx = (el.scrollLeft - prev) / dt;
    d.t = e.timeStamp;
  }
  function onUp() {
    const d = drag.current;
    const el = rail.current;
    if (!d || !el) return;
    if (d.moved) {
      el.scrollBy({ left: d.vx * 260, behavior: reducedNow() ? "auto" : "smooth" });
      // Re-enable snap after the throw so it settles on a card.
      setTimeout(() => setDragging(false), 360);
      setTimeout(() => (drag.current = null), 0);
    } else drag.current = null;
  }
  function onClickCapture(e: MouseEvent) {
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <section aria-labelledby="vendor-pilihan-judul" className="overflow-hidden bg-dc-cream py-20 sm:py-24 lg:py-28">
      <Reveal className="dc-container flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dc-eyebrow">Vendor di DuaCincin</p>
          <h2 id="vendor-pilihan-judul" className="mt-4 max-w-xl font-heading text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02] text-dc-ink">
            Lihat karyanya dulu, <span className="dc-em">ngobrol kemudian.</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {ready && (
            <div className="hidden gap-2 sm:flex">
              <Arrow dir={-1} disabled={edge.start} onClick={() => glide(-1)} />
              <Arrow dir={1} disabled={edge.end} onClick={() => glide(1)} />
            </div>
          )}
          <Link href="/vendors" className="inline-flex min-h-11 items-center font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
            Semua vendor
          </Link>
        </div>
      </Reveal>

      {directory.status === "loading" ? (
        <SkeletonGroup label="Memuat vendor" className="mt-10 flex gap-5 overflow-hidden" >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={`aspect-[4/5] w-[78%] shrink-0 rounded-2xl sm:w-[44%] lg:w-[30%] ${i === 0 ? "ml-4 sm:ml-12" : ""}`} />
          ))}
        </SkeletonGroup>
      ) : (
        <Reveal>
          <ul
            ref={rail}
            onScroll={measure}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onClickCapture={onClickCapture}
            aria-label="Vendor di DuaCincin, geser untuk melihat lainnya"
            style={{ paddingInline: EDGE, scrollPaddingInline: EDGE } as CSSProperties}
            className={`dc-stagger mt-10 flex gap-4 overflow-x-auto pb-6 pt-2 [scrollbar-width:none] sm:gap-5 lg:mt-12 [&::-webkit-scrollbar]:hidden ${
              dragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory md:cursor-grab"
            }`}
          >
            {cards.map((card) => (
              <li key={card.id} className="w-[78%] max-w-[420px] shrink-0 snap-start sm:w-[44%] lg:w-[30%]">
                <RailCard card={card} />
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </section>
  );
}
