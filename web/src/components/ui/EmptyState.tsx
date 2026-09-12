import Link from "next/link";

export function EmptyState({
  icon,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-dc-black/10 bg-dc-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-4 text-dc-navy/30">{icon}</div>}
      <p className="font-heading font-bold text-dc-navy">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-dc-black/50">{body}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-5 rounded-full bg-dc-navy px-5 py-2 text-sm font-semibold text-dc-white hover:bg-dc-gold hover:text-dc-navy">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
