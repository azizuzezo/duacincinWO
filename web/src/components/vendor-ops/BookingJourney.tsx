// The booking as a plain vertical journey: six steps from the vendor's side,
// the current one emphasised. Steps are derived from the booking status and
// whether a technical meeting is scheduled; nothing here changes any rule.
import type { Booking, Meeting } from "@/lib/api";

import { formatWaktu } from "./ops";

const STEPS = [
  { title: "Request", note: "Client mengirim permintaan untuk tanggal ini." },
  { title: "Konfirmasi", note: "Kamu menerima booking, client bisa membayar." },
  { title: "DP", note: "Client membayar DP 30%. Dana ditahan Dana Aman." },
  { title: "Technical meeting", note: "Sepakati rundown dan detail hari-H bersama client." },
  { title: "Hari-H", note: "Acara berlangsung. Client menandai acara selesai." },
  { title: "Cair", note: "Dana bersih masuk antrean pencairan dan ditransfer Admin." },
];

/** Index of the step the booking is on now. */
export function currentStep(status: Booking["status"], hasTechnicalMeeting: boolean): number {
  switch (status) {
    case "requested":
      return 0;
    case "confirmed":
      return 2;
    case "dp_paid":
    case "full_paid":
      return hasTechnicalMeeting ? 4 : 3;
    case "completed":
      return 5;
    default:
      return -1;
  }
}

export function BookingJourney({ status, meetings }: { status: Booking["status"]; meetings: Meeting[] }) {
  const tech = meetings.find((m) => m.type === "technical_meeting");
  const cur = currentStep(status, !!tech);
  return (
    <ol>
      {STEPS.map((s, i) => {
        const state = i < cur ? "done" : i === cur ? "current" : "next";
        const last = i === STEPS.length - 1;
        const note = i === 3 && tech ? `Terjadwal: ${formatWaktu(tech.scheduled_at)}` : s.note;
        return (
          <li key={s.title} aria-current={state === "current" ? "step" : undefined} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span aria-hidden className={`absolute left-[15px] top-8 bottom-0 w-px ${state === "done" ? "bg-wd-accent-deep" : "bg-wd-line-2"}`} />}
            <span
              aria-hidden
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-bold ${
                state === "done"
                  ? "bg-wd-accent-deep text-wd-ink"
                  : state === "current"
                    ? "bg-wd-accent text-wd-ink ring-4 ring-wd-accent-soft motion-safe:animate-pulse"
                    : "border border-wd-line-2 bg-white text-wd-muted"
              }`}
            >
              {state === "done" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <div className={`min-w-0 flex-1 pt-0.5 ${state === "next" ? "text-wd-muted" : ""}`}>
              <p className={`leading-snug ${state === "current" ? "text-[1.05rem] font-bold text-wd-ink" : state === "done" ? "font-semibold text-wd-ink" : "font-semibold"}`}>
                {s.title}
                <span className="sr-only">{state === "done" ? ", selesai" : state === "current" ? ", tahap sekarang" : ", berikutnya"}</span>
              </p>
              {(state === "current" || (i === 3 && tech)) && <p className="mt-0.5 text-sm leading-relaxed text-wd-text">{note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
