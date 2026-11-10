/**
 * Icon badge built from the DuaCincin mark: two interlocked rings, the front
 * one filled ink with the feature glyph in ivory, the back one a gold hairline.
 * Pass 24x24 stroke paths as children.
 */
export function FeatureIcon({ children, tone = "paper" }: { children: React.ReactNode; tone?: "paper" | "ink" }) {
  const front = tone === "ink" ? "fill-dc-gold-antique" : "fill-dc-ink";
  const glyph = tone === "ink" ? "#15110d" : "#f6efe3";
  return (
    <svg width="60" height="40" viewBox="0 0 60 40" className="shrink-0" aria-hidden>
      <circle cx="38" cy="20" r="17" fill="none" strokeWidth="1.2" className={tone === "ink" ? "stroke-dc-gold-antique" : "stroke-dc-gold"} />
      <circle cx="22" cy="20" r="17" className={front} />
      <g transform="translate(11, 9) scale(0.85)" fill="none" stroke={glyph} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}
