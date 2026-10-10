import type { BookingStatus } from "@/lib/api";

const STEPS: { status: BookingStatus; label: string }[] = [
  { status: "requested", label: "Diajukan" },
  { status: "confirmed", label: "Dikonfirmasi" },
  { status: "dp_paid", label: "DP Dibayar" },
  { status: "full_paid", label: "Lunas" },
  { status: "completed", label: "Selesai" },
];

/** Visual progress across the booking lifecycle (PRD §8.11). Cancelled
 * bookings just show a plain badge elsewhere, no stepper. Step labels are
 * always visible (small on mobile) and the current step is announced, so
 * progress never depends on color alone. */
export function BookingStepper({ status }: { status: BookingStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="flex items-start" aria-label="Tahap booking">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const current = i === currentIndex;
        return (
          <li
            key={step.status}
            aria-current={current ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1.5 text-center"
          >
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-3 h-px w-full ${i <= currentIndex ? "bg-dc-ink" : "bg-dc-ink/15"}`}
              />
            )}
            <span
              className={`relative flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${
                done ? "border-dc-ink bg-dc-ink text-dc-white" : "border-dc-ink/25 bg-dc-white text-dc-black/60"
              } ${current ? "ring-2 ring-dc-clay ring-offset-2 ring-offset-dc-white" : ""}`}
            >
              {done && !current ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`px-0.5 text-[11px] leading-tight sm:text-xs ${current ? "font-semibold text-dc-ink" : done ? "text-dc-ink" : "text-dc-black/60"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
