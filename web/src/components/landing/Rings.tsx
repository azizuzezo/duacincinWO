/** Identity motif: two interlocked rings, hairline, static. Gold is
 * decoration only (stroke), never text. */
export function Rings({ className = "", stroke = "var(--dc-gold)" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 64 40" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="20" r="16" stroke={stroke} strokeWidth="1" />
      <circle cx="40" cy="20" r="16" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}
