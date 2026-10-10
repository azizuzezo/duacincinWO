import type { BookingStatus } from "@/lib/api";

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

/** Segmented filter for a booking list by status, client-side (no backend
 * query param support for this yet, since the dataset per user is small).
 * Rectangular, not pills: pills are reserved for status Badges. */
export function BookingStatusFilter({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div role="group" aria-label="Filter status booking" className="mb-5 flex flex-wrap gap-2">
      {BOOKING_FILTERS.map((f) => {
        const active = value === f.key;
        return (
          <button
            key={f.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(f.key)}
            className={`min-h-11 rounded-md border px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
              active
                ? "border-dc-ink bg-dc-ink text-dc-white"
                : "border-dc-ink/15 bg-dc-white text-dc-ink hover:border-dc-ink/40"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
