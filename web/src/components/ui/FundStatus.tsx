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

const COPY: Record<Stage, { label: string; hint: string; step: number }> = {
  none: { label: "Belum ada pembayaran", hint: "Tidak ada dana yang berpindah.", step: 0 },
  held: { label: "Dana ditahan escrow", hint: "Diteruskan ke vendor setelah acara selesai.", step: 1 },
  released: { label: "Dana diteruskan ke vendor", hint: "Acara sudah dikonfirmasi selesai.", step: 2 },
  returned: { label: "Booking dibatalkan", hint: "Dana mengikuti ketentuan pembatalan.", step: -1 },
};

export function fundStage(status: BookingStatus): Stage {
  return STAGE_BY_STATUS[status];
}

/** Escrow position as a three-stop track (dibayar, ditahan, diteruskan) with
 * a label, so it reads without color. `compact` is the one-line version for
 * cards and table rows. */
export function FundStatus({ status, compact = false }: { status: BookingStatus; compact?: boolean }) {
  const c = COPY[STAGE_BY_STATUS[status]];
  // Filled stops: none 0, held 2 (paid + held), released 3. Cancelled stays hollow.
  const filled = c.step <= 0 ? 0 : c.step === 1 ? 2 : 3;
  const fill = c.step === 2 ? "bg-dc-success" : "bg-dc-gold";
  const dots = [0, 1, 2].map((i) => (
    <span key={i} className={`h-2 w-2 rounded-full transition-colors duration-300 ${i < filled ? fill : "border border-dc-line-strong"}`} />
  ));
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 flex shrink-0 items-center gap-1" aria-hidden>
        {dots}
      </span>
      <div>
        <p className="text-sm font-semibold text-dc-ink">{c.label}</p>
        {!compact && <p className="text-xs leading-relaxed text-dc-text-3">{c.hint}</p>}
      </div>
    </div>
  );
}
