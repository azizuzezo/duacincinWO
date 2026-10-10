import type { BookingStatus } from "@/lib/api";

// Where the client's money is, derived from the booking status (PRD §8.5/§8.11):
// nothing paid -> held in escrow (DP / full) -> passed to the vendor after the
// event is confirmed. Shown wherever money is mentioned so the escrow claim is
// visible in the product, not just in copy.
type Stage = "none" | "held" | "released" | "returned";

const STAGE_BY_STATUS: Record<BookingStatus, Stage> = {
  requested: "none",
  confirmed: "none",
  dp_paid: "held",
  full_paid: "held",
  completed: "released",
  cancelled: "returned",
};

const COPY: Record<Stage, { label: string; hint: string; dot: string }> = {
  none: { label: "Belum ada pembayaran", hint: "Tidak ada dana yang berpindah.", dot: "bg-dc-ink/30" },
  held: { label: "Dana ditahan escrow", hint: "Diteruskan ke vendor setelah acara selesai.", dot: "bg-dc-clay" },
  released: { label: "Dana diteruskan ke vendor", hint: "Acara sudah dikonfirmasi selesai.", dot: "bg-green-700" },
  returned: { label: "Booking dibatalkan", hint: "Dana mengikuti ketentuan pembatalan.", dot: "bg-dc-ink/30" },
};

export function fundStage(status: BookingStatus): Stage {
  return STAGE_BY_STATUS[status];
}

/** `compact` is the one-line chip used on cards; the default shows the hint too. */
export function FundStatus({ status, compact = false }: { status: BookingStatus; compact?: boolean }) {
  const c = COPY[STAGE_BY_STATUS[status]];
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.dot}`} aria-hidden />
      <div>
        <p className="text-sm font-medium text-dc-ink">{c.label}</p>
        {!compact && <p className="text-xs text-dc-black/70">{c.hint}</p>}
      </div>
    </div>
  );
}
