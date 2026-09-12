import Image from "next/image";

export function DashboardBanner({
  title,
  subtitle,
  action,
  image,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Optional decorative photo (client dashboard only) — echoes the real
   * photography used on the landing Hero instead of leaving the banner as
   * text-only navy, which read flat next to references like Bridestory/Viding. */
  image?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-dc-navy via-dc-navy/95 to-dc-black">
      <svg
        className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 animate-spin-slow opacity-[0.08]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="80" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
        <circle cx="130" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
      </svg>
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 py-10">
        <div className="animate-fade-up">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-dc-white sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-lg text-dc-white/70">{subtitle}</p>}
        </div>
        {action && <div className="animate-fade-up shrink-0">{action}</div>}
        {image && (
          <div className="animate-fade-up relative -mb-10 hidden h-40 w-32 shrink-0 sm:block">
            <div className="pointer-events-none absolute inset-0 -bottom-2 rounded-t-full bg-dc-rose/10 blur-2xl" />
            <Image src={image} alt="" fill sizes="140px" className="object-contain object-bottom drop-shadow-[0_16px_24px_rgba(0,0,0,0.4)]" />
          </div>
        )}
      </div>
    </div>
  );
}
