"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { Check, Shield } from "@/components/home/ui";
import { REVIEW_SOURCE_NOTE, Stars } from "@/components/vendor/Reviews";
import type { Review } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { ExpandableText } from "./Expandable";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const RATING = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const FIRST = 6;

function ReviewRow({ review }: { review: Review }) {
  const text = review.comment?.trim() ?? "";
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars rating={review.rating} size={15} />
        <span className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-wd-ok">
          <Check size={13} />
          Booking selesai
        </span>
        <span className="ml-auto text-sm text-wd-muted">{formatMonth(review.created_at)}</span>
      </div>
      {text ? (
        <div className="mt-2.5">
          <ExpandableText text={text} lines={4} className="leading-relaxed text-wd-text" more="Baca selengkapnya" />
        </div>
      ) : (
        <p className="mt-2.5 text-sm text-wd-muted">Memberi rating tanpa komentar.</p>
      )}
    </>
  );
}

/** Average and 5..1 spread computed from the loaded reviews (nothing
 * estimated), the source note, then a plain list with "show more". */
export function ReviewsBlock({ reviews }: { reviews: Review[] }) {
  const [all, setAll] = useState(false);
  const reduced = useReducedMotion();
  const firstNew = useRef<HTMLLIElement>(null);
  // After "show more", focus lands on the first newly shown review so a
  // keyboard or screen reader user continues reading where the list grew.
  useEffect(() => {
    if (all) firstNew.current?.focus({ preventScroll: true });
  }, [all]);
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  const max = Math.max(...counts.map((x) => x.c), 1);
  const shown = all ? reviews : reviews.slice(0, FIRST);
  const rest = reviews.length - shown.length;

  return (
    <div>
      <div className="grid gap-6 rounded-[14px] bg-wd-paper p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-6">
        <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1.5">
          <p className="text-5xl font-semibold leading-none tracking-tight text-wd-ink tabular-nums">{RATING.format(avg)}</p>
          <div>
            <Stars rating={avg} size={17} />
            <p className="mt-1 text-sm text-wd-muted">dari {reviews.length} ulasan</p>
          </div>
        </div>
        <ul className="min-w-0 space-y-1.5" aria-label="Sebaran rating">
          {counts.map(({ n, c }) => (
            <li key={n} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 whitespace-nowrap tabular-nums text-wd-text">{n} bintang</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-wd-line" aria-hidden>
                <span className="block h-full rounded-full bg-wd-gold" style={{ width: `${(c / max) * 100}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-wd-ink">
                {c}
                <span className="sr-only"> ulasan</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-wd-text">
        <Shield size={16} className="mt-0.5 shrink-0 text-wd-ok" />
        {REVIEW_SOURCE_NOTE}
      </p>
      <ul className="mt-2">
        <AnimatePresence initial={false}>
          {shown.map((r, i) => (
            <motion.li
              key={r.id}
              ref={i === FIRST ? firstNew : undefined}
              tabIndex={i === FIRST ? -1 : undefined}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0.01 : 0.4, ease: EASE, delay: reduced ? 0 : Math.max(0, i - FIRST) * 0.04 } }}
              className="rounded-md border-b border-wd-line py-5 outline-offset-4 last:border-b-0 focus-visible:outline-2 focus-visible:outline-wd-accent-ink"
            >
              <ReviewRow review={r} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-2 inline-flex min-h-11 items-center rounded-full border border-wd-line-2 px-5 text-sm font-semibold text-wd-ink transition-[border-color,transform] hover:border-wd-ink active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink"
        >
          Tampilkan {rest} ulasan lagi
        </button>
      )}
    </div>
  );
}
