// Status label. Pill shape because a badge is a status, and status is one of
// the few places a pill carries meaning. Text never relies on color alone.
const TONES = {
  neutral: "bg-dc-cream text-dc-text-2",
  gold: "bg-dc-gold/15 text-dc-clay",
  clay: "bg-dc-clay/10 text-dc-clay",
  ink: "bg-dc-ink text-dc-on-dark",
  success: "bg-dc-success/10 text-dc-success",
  danger: "bg-dc-danger/10 text-dc-danger",
};

export type BadgeTone = keyof typeof TONES;

export function Badge({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
