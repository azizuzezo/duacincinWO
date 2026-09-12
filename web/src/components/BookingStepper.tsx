import type { BookingStatus } from "@/lib/api";

const STEPS: { status: BookingStatus; label: string }[] = [
  { status: "requested", label: "Diajukan" },
  { status: "confirmed", label: "Dikonfirmasi" },
  { status: "dp_paid", label: "DP Dibayar" },
  { status: "full_paid", label: "Lunas" },
  { status: "completed", label: "Selesai" },
];

/** Visual progress across the booking lifecycle (PRD §8.11). Cancelled
 * bookings just show a plain badge elsewhere — no stepper. */
export function BookingStepper({ status }: { status: BookingStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <div key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done ? "bg-dc-navy text-dc-gold" : "bg-dc-offwhite text-dc-black/30"
                }`}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`hidden text-[11px] font-medium sm:block ${done ? "text-dc-navy" : "text-dc-black/40"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${i < currentIndex ? "bg-dc-navy" : "bg-dc-offwhite"}`} />}
          </div>
        );
      })}
    </div>
  );
}
