// Status label. Pill shape because a badge is a status, and status is one of
// the few places a pill carries meaning. Text never relies on color alone.
// Soft fill + matching text tone + a faint inset ring so the chip keeps its
// edge on cream and white alike. Every pair is 5:1 or more (WCAG AA).
// gold = money held / brand moment, warning = the user's turn to act,
// info = waiting on someone else, success = done, danger = problem.
const TONES = {
  neutral: "bg-dc-cream text-dc-text-2 ring-1 ring-inset ring-dc-line",
  gold: "bg-dc-gold-soft text-dc-clay ring-1 ring-inset ring-dc-gold/25",
  clay: "bg-dc-gold-wash text-dc-clay ring-1 ring-inset ring-dc-clay/15",
  ink: "bg-dc-ink text-dc-on-dark",
  success: "bg-dc-success-soft text-dc-success ring-1 ring-inset ring-dc-success/15",
  warning: "bg-dc-warning-soft text-dc-warning ring-1 ring-inset ring-dc-warning/20",
  info: "bg-dc-info-soft text-dc-info ring-1 ring-inset ring-dc-info/15",
  danger: "bg-dc-danger-soft text-dc-danger ring-1 ring-inset ring-dc-danger/15",
};

export type BadgeTone = keyof typeof TONES;

export function Badge({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
