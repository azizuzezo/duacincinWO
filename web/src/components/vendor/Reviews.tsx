"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { GrowX, MotionItem, MotionList } from "@/components/ui/Motion";
import type { Review } from "@/lib/api";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const STAR_PATH = "M10 1.6l2.47 5.2 5.68.66-4.2 3.9 1.12 5.62L10 14.2l-5.07 2.78 1.12-5.62-4.2-3.9 5.68-.66z";

/** Five stars as one image with a text alternative. Partial ratings fill the
 * last star proportionally so 4.6 does not read as 5. */
export function Stars({ rating, size = 16, className = "" }: { rating: number; size?: number; className?: string }) {
  const value = Math.max(0, Math.min(5, rating));
  return (
    <span role="img" aria-label={`Rating ${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} dari 5`} className={`inline-flex gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
            <svg viewBox="0 0 20 20" width={size} height={size} className="absolute inset-0 text-dc-line-strong">
              <path d={STAR_PATH} fill="currentColor" />
            </svg>
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg viewBox="0 0 20 20" width={size} height={size} className="text-dc-gold">
                  <path d={STAR_PATH} fill="currentColor" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Average plus a 5..1 distribution, all computed from the reviews actually
 * loaded: nothing is estimated or rounded up. */
export function ReviewSummary({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const max = Math.max(...counts.map((x) => x.c), 1);
  return (
    <div className="grid gap-6 rounded-xl border border-dc-line bg-dc-white p-5 shadow-soft sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-7">
      <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1">
        <p className="font-heading text-6xl leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums] sm:text-7xl">
          {avg.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </p>
        <div>
          <Stars rating={avg} size={18} />
          <p className="mt-1 text-sm text-dc-text-2">dari {reviews.length} ulasan</p>
        </div>
      </div>
      <ul className="min-w-0 space-y-2" aria-label="Sebaran rating">
        {counts.map(({ n, c }) => (
          <li key={n} className="flex items-center gap-3 text-sm">
            <span className="w-16 shrink-0 whitespace-nowrap tabular-nums text-dc-text-2">{n} bintang</span>
            <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-dc-cream" aria-hidden>
              <GrowX as="span" className="h-full">
                <span className="block h-full rounded-full bg-dc-gold" style={{ width: `${(c / max) * 100}%` }} />
              </GrowX>
            </span>
            <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-dc-ink">
              {c}
              <span className="sr-only"> ulasan</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LONG = 260;

function ReviewItem({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const text = review.comment?.trim() ?? "";
  const long = text.length > LONG;
  return (
    <MotionItem className="rounded-xl border border-dc-line bg-dc-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Stars rating={review.rating} />
        <Badge tone="success">
          <svg aria-hidden width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
          </svg>
          Booking selesai
        </Badge>
        <span className="ml-auto text-sm text-dc-text-3">{formatMonth(review.created_at)}</span>
      </div>
      {text ? (
        <>
          <p className="mt-3 whitespace-pre-line break-words text-[0.98rem] leading-relaxed text-dc-black">
            {long && !open ? `${text.slice(0, LONG).trimEnd()}...` : text}
          </p>
          {long && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="-ml-2 mt-1 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
            >
              {open ? "Tampilkan lebih sedikit" : "Baca selengkapnya"}
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-dc-text-3">Memberi rating tanpa komentar.</p>
      )}
    </MotionItem>
  );
}

/** Review cards. `initial` shows the first N and a button for the rest
 * (public profile); without it every review passed in is shown. */
export function ReviewList({ reviews, initial }: { reviews: Review[]; initial?: number }) {
  const [all, setAll] = useState(false);
  const shown = initial && !all ? reviews.slice(0, initial) : reviews;
  const rest = reviews.length - shown.length;
  return (
    <div>
      <MotionList inView className="grid gap-3">
        {shown.map((r) => (
          <ReviewItem key={r.id} review={r} />
        ))}
      </MotionList>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-dc-line-strong px-5 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
        >
          Tampilkan {rest} ulasan lagi
        </button>
      )}
    </div>
  );
}

export const REVIEW_SOURCE_NOTE = "Semua ulasan berasal dari client yang menyelesaikan booking lewat DuaCincin. Tidak ada ulasan yang bisa ditulis tanpa booking selesai.";
