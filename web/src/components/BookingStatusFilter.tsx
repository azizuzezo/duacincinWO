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

/** Pill tabs for filtering a booking list by status client-side (no backend
 * query param support for this yet, since the dataset per user is small). */
export function BookingStatusFilter({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {BOOKING_FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            value === f.key ? "bg-dc-navy text-dc-white" : "bg-dc-white text-dc-navy/70 hover:bg-dc-offwhite"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
