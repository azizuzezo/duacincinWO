// The only pill in the system: a badge is a status, and status is the one
// place a pill shape carries meaning.
const TONES = {
  neutral: "bg-dc-cream text-dc-black/70",
  gold: "bg-dc-gold/15 text-dc-ink",
  clay: "bg-dc-clay/10 text-dc-clay",
  success: "bg-green-100 text-green-900",
  danger: "bg-red-100 text-red-800",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
