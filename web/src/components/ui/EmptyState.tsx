import { ButtonLink } from "./Button";
import { Rings } from "./Rings";

/** Shown when a list has no data yet. Always says what to do next. The ring
 * motif replaces a generic icon unless a specific one is given. */
export function EmptyState({
  icon,
  title,
  body,
  actionHref,
  actionLabel,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  /** Custom action node (e.g. a Button with onClick) instead of a link. */
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-6 py-14 text-center">
      <div className="mb-4 text-dc-gold">{icon ?? <Rings className="h-10 w-16" stroke="currentColor" />}</div>
      <p className="font-heading text-[1.75rem] leading-tight text-dc-ink">{title}</p>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-dc-text-2">{body}</p>}
      {action ? (
        <div className="mt-6">{action}</div>
      ) : (
        actionHref &&
        actionLabel && (
          <ButtonLink href={actionHref} size="sm" className="mt-6">
            {actionLabel}
          </ButtonLink>
        )
      )}
    </div>
  );
}
