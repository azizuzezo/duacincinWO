/** "Bold glass" accent: gradient navy→rose, glass surface, gold glow border.
 * Used sparingly, for hero/celebratory moments and empty states, not as a
 * default card surface. Sibling to DashboardBanner (the top-of-page hero),
 * for accents that live inline within page content instead. */
export function GlowPanel({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dc-gold/40 bg-gradient-to-br from-dc-navy to-dc-rose p-6 shadow-lg shadow-dc-navy/20">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-dc-gold/20 blur-3xl" />
      <div className="relative">
        {title && <h3 className="font-heading text-lg font-bold text-dc-white">{title}</h3>}
        {subtitle && <p className="mt-1 text-sm text-dc-white/80">{subtitle}</p>}
        {children}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
