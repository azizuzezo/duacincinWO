"use client";

import { motion } from "framer-motion";
import { useId } from "react";

import type { BookingStatus } from "@/lib/api";
import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

export type BookingFilterOption = { key: string; label: string; statuses?: BookingStatus[] };

export const BOOKING_FILTERS: BookingFilterOption[] = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif", statuses: ["requested", "confirmed", "dp_paid", "full_paid"] },
  { key: "completed", label: "Selesai", statuses: ["completed"] },
  { key: "cancelled", label: "Dibatalkan", statuses: ["cancelled"] },
];

export function matchesBookingFilter(status: BookingStatus, filterKey: string): boolean {
  const active = BOOKING_FILTERS.find((f) => f.key === filterKey);
  return !active?.statuses || active.statuses.includes(status);
}

/** Count of bookings per filter key, for the optional `counts` prop. */
export function countBookingFilters(statuses: BookingStatus[]): Record<string, number> {
  return Object.fromEntries(BOOKING_FILTERS.map((f) => [f.key, statuses.filter((s) => matchesBookingFilter(s, f.key)).length]));
}

/** Segmented filter for a booking list by status, client-side (the list per
 * user is small). Pill chips on a cream track; the ink selection slides
 * between options so the change of view is felt, not just seen. Pass
 * `counts` (see countBookingFilters) to show how many fall under each. The
 * track scrolls sideways inside itself on very narrow screens. */
export function BookingStatusFilter({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (key: string) => void;
  counts?: Record<string, number>;
}) {
  const reduced = useReducedMotion();
  const layoutId = useId();
  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div role="group" aria-label="Filter status booking" className="inline-flex gap-1 rounded-full bg-dc-cream p-1">
        {BOOKING_FILTERS.map((f) => {
          const active = value === f.key;
          const n = counts?.[f.key];
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(f.key)}
              className={`relative inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                active ? "text-dc-on-dark" : "text-dc-text-2 hover:text-dc-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={reduced ? undefined : `booking-filter-${layoutId}`}
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-dc-ink"
                />
              )}
              <span className="relative">{f.label}</span>
              {n !== undefined && (
                <span className={`relative text-xs tabular-nums ${active ? "text-dc-gold-antique" : "text-dc-text-3"}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
