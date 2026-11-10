import Image from "next/image";

/** Page opener for dashboards: an ink band with a warm film grade. With a
 * `photo` the image sits under a left-to-right scrim (the text side stays
 * dark enough for AA); without it the band is plain ink with the ring motif.
 * Content below can overlap the band with a negative top margin. */
export function DashboardBanner({
  title,
  subtitle,
  action,
  photo,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  photo?: string;
  eyebrow?: string;
}) {
  return (
    <div className="dc-on-dark relative isolate overflow-hidden bg-dc-ink">
      {photo ? (
        <>
          <Image src={photo} alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-dc-ink via-dc-ink/85 to-dc-ink/45" aria-hidden />
        </>
      ) : (
        <svg aria-hidden viewBox="0 0 64 40" fill="none" className="absolute -right-16 -top-24 -z-10 h-[340px] w-[540px] opacity-[0.14]">
          <circle cx="24" cy="20" r="16" stroke="var(--dc-gold-antique)" strokeWidth="0.25" />
          <circle cx="40" cy="20" r="16" stroke="var(--dc-gold-antique)" strokeWidth="0.25" />
        </svg>
      )}
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <div className="animate-fade-up">
          {eyebrow && <p className="dc-eyebrow mb-3">{eyebrow}</p>}
          <h1 className="font-heading text-[2.6rem] leading-[1.02] text-dc-on-dark sm:text-6xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-xl leading-relaxed text-dc-on-dark/80">{subtitle}</p>}
        </div>
        {action && <div className="animate-fade-up shrink-0">{action}</div>}
      </div>
    </div>
  );
}
