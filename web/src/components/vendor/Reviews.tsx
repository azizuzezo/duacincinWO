import type { Review } from "@/lib/api";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`Rating ${rating} dari 5`} className="text-dc-clay">
      {"★".repeat(rating)}
      <span className="text-dc-ink/25">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/** Average plus a 5..1 distribution, all computed from the reviews actually
 * loaded: nothing is estimated or rounded up. */
export function ReviewSummary({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
      <div>
        <p className="font-sans text-5xl font-semibold tabular-nums tracking-tight text-dc-ink">{avg.toFixed(1)}</p>
        <Stars rating={Math.round(avg)} />
        <p className="mt-1 text-sm text-dc-black/70">{reviews.length} ulasan</p>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5" aria-label="Sebaran rating">
        {counts.map(({ n, c }) => (
          <li key={n} className="flex items-center gap-3 text-sm">
            <span className="w-[4.5rem] shrink-0 whitespace-nowrap tabular-nums text-dc-black/70">{n} bintang</span>
            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-dc-ink/10" aria-hidden>
              <span className="block h-full bg-dc-clay" style={{ width: `${(c / reviews.length) * 100}%` }} />
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums text-dc-ink">{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <ul className="divide-y divide-dc-ink/10 border-y border-dc-ink/10">
      {reviews.map((r) => (
        <li key={r.id} className="py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <Stars rating={r.rating} />
            <span className="text-xs text-dc-black/70">{formatMonth(r.created_at)}</span>
          </div>
          {r.comment ? <p className="mt-2 max-w-2xl whitespace-pre-line break-words text-dc-black/80">{r.comment}</p> : <p className="mt-2 text-sm text-dc-black/70">Tanpa komentar.</p>}
        </li>
      ))}
    </ul>
  );
}

export const REVIEW_SOURCE_NOTE = "Semua ulasan berasal dari client yang menyelesaikan booking lewat DuaCincin. Tidak ada ulasan yang bisa ditulis tanpa booking selesai.";
