/** Identity motif: two interlocked rings as a hairline. Decorative only.
 * For the logo use BrandLogo; for section labels use the .dc-eyebrow class. */
export function Rings({ className = "", stroke = "var(--dc-gold)", strokeWidth = 1.2 }: { className?: string; stroke?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 64 40" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="20" r="16" stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx="40" cy="20" r="16" stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}
