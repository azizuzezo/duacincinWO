import Image from "next/image";

/** Page opener for dashboards. Without a `photo` it is a light champagne band
 * that fades into the canvas, with the two-ring motif drawn in clay: the
 * greeting reads warm without a heavy dark slab beside the sidebar. With a
 * `photo` the image sits under an ink scrim (the text side stays dark enough
 * for AA). Content below can overlap the band with a negative top margin.
 * Accent words in `title`: .dc-em on the light band, .dc-em-light on a photo. */
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
    <div className={`relative isolate overflow-hidden ${photo ? "dc-on-dark bg-dc-ink" : "bg-linear-to-b from-dc-gold-wash to-dc-canvas"}`}>
      {photo ? (
        <>
          <Image src={photo} alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-dc-ink via-dc-ink/85 to-dc-ink/45" aria-hidden />
        </>
      ) : (
        <svg aria-hidden viewBox="0 0 64 40" fill="none" className="absolute -right-16 -top-24 -z-10 h-[340px] w-[540px] opacity-[0.22]">
          <circle cx="24" cy="20" r="16" stroke="var(--dc-gold)" strokeWidth="0.25" />
          <circle cx="40" cy="20" r="16" stroke="var(--dc-gold)" strokeWidth="0.25" />
        </svg>
      )}
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <div className="animate-fade-up">
          {eyebrow && <p className="dc-eyebrow mb-3">{eyebrow}</p>}
          <h1 className={`font-heading text-[2.6rem] leading-[1.02] sm:text-6xl ${photo ? "text-dc-on-dark" : "text-dc-ink"}`}>{title}</h1>
          {subtitle && <p className={`mt-3 max-w-xl leading-relaxed ${photo ? "text-dc-on-dark/80" : "text-dc-text-2"}`}>{subtitle}</p>}
        </div>
        {action && <div className="animate-fade-up shrink-0">{action}</div>}
      </div>
    </div>
  );
}
