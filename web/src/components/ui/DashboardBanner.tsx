import Image from "next/image";

/** Page opener for dashboards: an ink band with the title in white. An optional
 * `photo` sits under a flat ink veil (client dashboard) so the first screen
 * carries the same cinematic note as the public site; without it the band is
 * plain ink (admin). Content below can overlap the band with a negative top
 * margin to pull the main action up. */
export function DashboardBanner({
  title,
  subtitle,
  action,
  photo,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  photo?: string;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-dc-ink">
      {photo && (
        <>
          <Image src={photo} alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-dc-ink/70" aria-hidden />
        </>
      )}
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <div className="animate-fade-up">
          <h1 className="font-heading text-4xl leading-[1.05] text-dc-white sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-xl text-dc-white/80">{subtitle}</p>}
        </div>
        {action && <div className="animate-fade-up shrink-0">{action}</div>}
      </div>
    </div>
  );
}
