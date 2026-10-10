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
    <div className="flex flex-col items-center rounded-lg border border-dashed border-dc-ink/20 bg-dc-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-4 text-dc-ink/40">{icon}</div>}
      <p className="font-heading text-2xl text-dc-ink">{title}</p>
      {body && <p className="mt-2 max-w-sm text-sm text-dc-black/70">{body}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-dc-ink px-5 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
