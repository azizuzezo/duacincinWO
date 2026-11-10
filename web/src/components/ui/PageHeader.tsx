/** Title block at the top of every app page: optional ring-motif eyebrow,
 * serif title, one-line subtitle, actions on the right (wrap below on mobile). */
export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-10">
      <div className="min-w-0 animate-fade-up">
        {eyebrow && <p className="dc-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-heading text-[2.5rem] leading-[1.05] text-dc-ink sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2.5 max-w-2xl leading-relaxed text-dc-text-2">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
