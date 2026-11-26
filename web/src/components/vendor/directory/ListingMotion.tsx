"use client";

// Interactive pieces of the vendor listing (/vendors and /kategori): the
// listing card with its hover depth, the grid that re-flows when filters
// change, the ticking result count, the single-choice chips with a sliding
// gold pill, quick city chips with counts, and back-to-top. Every motion
// here explains a change (what moved, what is new, what is chosen) and drops
// to an instant swap under prefers-reduced-motion.
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ArrowRight, Shield, Star } from "@/components/home/ui";
import { categoryLabel, formatRupiah, type DirectoryCard, vendorCities } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";
import { CardPhoto } from "@/components/ui/CardPhoto";

import { GRID } from "./ListingParts";
import { useShareLink } from "./useShareLink";

const RATING = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "Rp12.750.000" -> "Rp12,75 jt" for the quick-look strip on the photo. */
function shortRupiah(v: number): string {
  if (v >= 1_000_000) return `Rp${jt(v)} jt`;
  return formatRupiah(v);
}
const jt = (v: number) => (v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** Price range in as few characters as the strip allows: "Rp4,25 sampai 12,75 jt". */
function rangeLabel(min: number, max: number): string {
  if (min >= 1_000_000) return `Rp${jt(min)} sampai ${jt(max)} jt`;
  return `${formatRupiah(min)} sampai ${shortRupiah(max)}`;
}

/** The listing card (render inside a `group/c` wrapper, as ListingGrid
 * does, so the lift also holds while the share button is hovered). Same facts as the home rail card (price only when set,
 * rating only with reviews, escrow on every card) plus how many cities the
 * vendor serves. On hover or keyboard focus the card lifts, the photo zooms
 * slowly and a strip on the photo shows the price range (when the vendor set
 * both ends) and "Lihat profil", so the whole card reads as one target. */
export function ListingCard({ card, priority = false }: { card: DirectoryCard; priority?: boolean }) {
  const cities = vendorCities(card);
  const more = cities.length > 1 ? cities.length - 1 : 0;
  const range = card.price_min > 0 && card.price_max > card.price_min;
  return (
    <Link
      href={`/vendors/${card.id}`}
      className="group block h-full rounded-[16px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-wd-accent-ink"
    >
      <span className="@container relative block aspect-[4/5] overflow-hidden rounded-[14px] bg-wd-blush shadow-none transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/c:-translate-y-1 group-hover/c:shadow-wd-lift group-focus-visible:-translate-y-1 group-focus-visible:shadow-wd-lift motion-reduce:transition-none motion-reduce:group-hover/c:translate-y-0 motion-reduce:group-focus-visible:translate-y-0">
        {card.sample_image ? (
          <CardPhoto
            src={card.sample_image}
            alt={`Portofolio ${card.business_name}`}
            priority={priority}
            sizes="(min-width: 1280px) 260px, (min-width: 1024px) 30vw, (min-width: 480px) 45vw, 90vw"
            className="transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] group-focus-visible:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-wd-muted">Belum ada foto</span>
        )}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[0.72rem] font-semibold text-wd-ink">
          <Shield size={11} className="text-wd-accent-ink" />
          Escrow
        </span>
        {/* Quick look: slides up from the photo's bottom edge on hover/focus. */}
        <span
          aria-hidden
          className="absolute inset-x-2.5 bottom-2.5 hidden translate-y-2 items-center justify-between [@media(hover:hover)]:flex gap-2 rounded-full bg-white/95 py-1.5 pl-3.5 pr-1.5 text-[0.8rem] opacity-0 shadow-wd-card transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-opacity"
        >
          <span className="min-w-0 truncate tabular-nums text-wd-text">
            {range ? rangeLabel(card.price_min, card.price_max) : card.price_min > 0 ? `Mulai ${shortRupiah(card.price_min)}` : "Harga lewat chat"}
          </span>
          <span className="inline-flex size-7 shrink-0 items-center justify-center gap-1 rounded-full bg-wd-accent font-semibold text-wd-ink @[17rem]:size-auto @[17rem]:px-3 @[17rem]:py-1">
            <span className="hidden @[17rem]:inline">Lihat profil</span>
            <ArrowRight size={13} />
          </span>
        </span>
      </span>
      <span className="block pt-3">
        <span className="line-clamp-2 break-words text-[1rem] font-semibold leading-snug text-wd-ink transition-colors group-hover:text-wd-accent-ink">{card.business_name}</span>
        <span className="mt-1 block truncate text-[0.85rem] text-wd-muted">
          {categoryLabel(card.category)} · {card.city}
          {more > 0 && <> +{more} kota</>}
        </span>
        {card.review_count > 0 && (
          <span className="mt-1.5 flex items-center gap-1 text-[0.85rem]">
            <span className="flex text-wd-gold" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={13} className={i < Math.round(card.average_rating) ? "" : "opacity-30"} />
              ))}
            </span>
            <span className="sr-only">Rating</span>
            <span className="font-semibold tabular-nums text-wd-ink">{RATING.format(card.average_rating)}</span>
            <span className="text-wd-muted">({card.review_count} ulasan)</span>
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

/** The card grid. Cards that stay glide to their new slot (sort, filter),
 * cards that leave fade out, new ones rise in with a short stagger, so the
 * eye can follow what changed. The first paint (server HTML) is not animated. */
export function ListingGrid({ cards }: { cards: DirectoryCard[] }) {
  const reduced = useReducedMotion();
  return (
    <ul className={GRID}>
      <AnimatePresence initial={false} mode="popLayout">
        {cards.map((c, i) => (
          <motion.li
            key={c.id}
            layout={reduced ? false : "position"}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: reduced ? 0.01 : 0.45, ease: EASE, delay: reduced ? 0 : Math.min(i, 8) * 0.035 } }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.97, transition: { duration: reduced ? 0.01 : 0.18 } }}
            transition={{ layout: { duration: 0.45, ease: EASE } }}
          >
            <div className="group/c relative h-full">
              <ListingCard card={c} priority={i < 4} />
              <CardShare card={c} />
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Share button on the card photo (top right), outside the card link so it
 * is its own control. Copies the profile link or opens the share sheet. */
function CardShare({ card }: { card: DirectoryCard }) {
  const share = useShareLink();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  async function onClick() {
    if (await share(`${card.business_name} di DuaCincin`, `/vendors/${card.id}`)) {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Bagikan profil ${card.business_name}`}
      className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/c:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover/c:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wd-accent-ink"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-white/95 text-wd-ink shadow-wd-card transition-transform duration-200 hover:scale-110 active:scale-95 motion-reduce:transition-none">
        {copied ? (
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-wd-ok">
            <path d="M4.5 12.5 9.5 17.5 19.5 7" />
          </svg>
        ) : (
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
            <path d="M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5" />
          </svg>
        )}
      </span>
    </button>
  );
}

/** The result number rolls up or down to its new value, so a filter change
 * reads as "fewer" or "more" at a glance. Plain number for reduced motion. */
export function CountNumber({ value }: { value: number }) {
  const reduced = useReducedMotion();
  // Direction of the last change, derived during render (no effect needed).
  const [last, setLast] = useState({ value, dir: 1 });
  if (last.value !== value) setLast({ value, dir: value > last.value ? 1 : -1 });
  const dir = last.value !== value ? (value > last.value ? 1 : -1) : last.dir;
  if (reduced) return <span className="font-semibold tabular-nums text-wd-ink">{value}</span>;
  return (
    <span className="relative inline-flex overflow-hidden align-bottom font-semibold tabular-nums text-wd-ink">
      <AnimatePresence initial={false} mode="popLayout" custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          variants={{
            enter: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }),
            center: { y: 0, opacity: 1 },
            exit: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: EASE }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Single choice as gold chips (phone filter sheet, 44px, aria-pressed). The
 * gold fill slides from the old choice to the new one. */
export function ChoiceChips({
  legend,
  value,
  onPick,
  options,
  hint,
}: {
  legend: string;
  value: string;
  onPick: (value: string) => void;
  options: { value: string; label: string; count?: number }[];
  hint?: string;
}) {
  const id = useId();
  const reduced = useReducedMotion();
  return (
    <fieldset>
      <legend className="text-base font-semibold text-wd-ink">{legend}</legend>
      {hint && <p className="mt-1 text-[0.85rem] text-wd-muted">{hint}</p>}
      <LayoutGroup id={id}>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value || "semua"}
                type="button"
                aria-pressed={on}
                onClick={() => onPick(o.value)}
                className={`relative isolate inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[0.9rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink ${
                  on ? "border-wd-accent font-semibold text-wd-ink" : "border-wd-accent-line text-wd-accent-ink hover:bg-wd-accent-wash"
                }`}
              >
                {on && (
                  <motion.span
                    aria-hidden
                    layoutId="pill"
                    transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
                    className="absolute -inset-px -z-10 rounded-full bg-wd-accent"
                  />
                )}
                {o.label}
                {o.count !== undefined && <span className={`tabular-nums ${on ? "text-wd-ink" : "text-wd-muted"}`}>{o.count}</span>}
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </fieldset>
  );
}

/** Cities that appear most in the loaded list, with their real vendor
 * counts, as one-tap toggles next to the full kota picker. */
export function CityQuickChips({
  counts,
  value,
  onPick,
  limit = 6,
}: {
  counts: Map<string, number>;
  value: string;
  onPick: (city: string) => void;
  limit?: number;
}) {
  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .slice(0, limit);
  if (top.length < 2) return null;
  return (
    <ul aria-label="Kota terbanyak" className="mt-3 flex flex-wrap gap-1.5">
      {top.map(([city, n]) => {
        const on = city === value;
        return (
          <li key={city}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? "" : city)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[0.84rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink ${
                on ? "border-wd-accent bg-wd-accent font-semibold text-wd-ink" : "border-wd-line-2 text-wd-text hover:border-wd-ink hover:text-wd-ink"
              }`}
            >
              {city}
              <span className={`tabular-nums ${on ? "text-wd-ink" : "text-wd-muted"}`}>
                <span className="sr-only">, </span>
                {n}
                <span className="sr-only"> vendor</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Appears once the visitor is well into a long list; returns to the top and
 * puts keyboard focus on the page heading so the next Tab starts there. */
export function BackToTop({ after = 1400 }: { after?: number }) {
  const [show, setShow] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShow(window.scrollY > after));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [after]);

  function toTop() {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1) {
      if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: true });
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={toTop}
          aria-label="Kembali ke atas"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: reduced ? 0.01 : 0.25, ease: EASE }}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 flex size-12 items-center justify-center rounded-full border border-wd-line-2 bg-white text-wd-ink shadow-wd-lift transition-colors hover:border-wd-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink sm:right-6"
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
