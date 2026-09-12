/**
 * Icon badge shaped like the DuaCincin mark itself: two overlapping rings
 * (navy over gold), with the feature glyph sitting inside the navy ring.
 * Deliberately not a generic icon-in-a-gray-square — every icon on the
 * dashboards is built from the same two-rings motif as the logo.
 */
export function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="60" height="40" viewBox="0 0 60 40" className="shrink-0" aria-hidden>
      <circle cx="38" cy="20" r="18" className="fill-dc-gold" />
      <circle cx="22" cy="20" r="18" className="fill-dc-navy" />
      <g transform="translate(11, 9) scale(0.85)" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}
