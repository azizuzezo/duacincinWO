/** Single dark ink block, used at most once per page for a moment that
 * deserves weight (a next step, a celebration). Name kept for API stability;
 * the glow itself is gone (DESIGN.md: no glow, no gradient fills). */
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
    <div className="rounded-lg bg-dc-ink p-6 sm:p-8">
      {title && <h3 className="font-heading text-2xl text-dc-white">{title}</h3>}
      {subtitle && <p className="mt-2 max-w-xl text-sm text-dc-white/75">{subtitle}</p>}
      {children}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
