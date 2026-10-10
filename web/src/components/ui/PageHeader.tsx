export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-dc-gold/40 pb-6">
      <div>
        <h1 className="font-heading text-4xl leading-tight text-dc-ink sm:text-[2.75rem]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-dc-black/70">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
