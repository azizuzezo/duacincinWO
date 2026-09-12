const TONES = {
  neutral: "bg-dc-offwhite text-dc-black/60",
  gold: "bg-dc-gold/15 text-dc-navy",
  success: "bg-green-100 text-green-800",
  danger: "bg-red-100 text-red-700",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
