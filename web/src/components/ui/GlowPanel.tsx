/** The one dark ink block of a screen, for a moment that deserves weight
 * (next step, celebration, escrow summary). A soft gold light in one corner
 * gives it depth; it is the only glow allowed on the page. Name kept for API
 * stability. */
export function GlowPanel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`dc-on-dark relative isolate overflow-hidden rounded-xl bg-dc-ink p-6 text-dc-on-dark sm:p-8 ${className}`}>
      <div
        aria-hidden
        className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(220,187,118,0.28),transparent)]"
      />
      {title && <h3 className="font-heading text-[1.9rem] leading-tight text-dc-on-dark">{title}</h3>}
      {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-dc-on-dark/80">{subtitle}</p>}
      {children}
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}
