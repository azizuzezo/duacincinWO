/**
 * Icon badge built from the DuaCincin mark: two interlocked rings drawn as
 * hairlines, with the feature glyph inside the front ring. Line-only so it
 * sits quietly on paper instead of reading as a filled app-icon tile.
 */
export function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="60" height="40" viewBox="0 0 60 40" className="shrink-0" aria-hidden>
      <circle cx="38" cy="20" r="17" fill="none" strokeWidth="1.2" className="stroke-dc-gold" />
      <circle cx="22" cy="20" r="17" className="fill-dc-ink" />
      <g transform="translate(11, 9) scale(0.85)" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}
