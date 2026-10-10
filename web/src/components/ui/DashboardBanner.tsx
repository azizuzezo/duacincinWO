import Image from "next/image";

/** Page opener for dashboards: serif title on paper over a gold hairline,
 * replacing the old full-bleed dark banner so data starts higher on screen. */
export function DashboardBanner({
  title,
  subtitle,
  action,
  image,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Optional photo (client dashboard only), shown as a small framed portrait. */
  image?: string;
}) {
  return (
    <div className="border-b border-dc-gold/40 bg-dc-ivory">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
        <div className="animate-fade-up">
          <h1 className="font-heading text-4xl leading-[1.1] text-dc-ink sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-xl text-dc-black/70">{subtitle}</p>}
        </div>
        <div className="flex items-end gap-6">
          {action && <div className="animate-fade-up shrink-0">{action}</div>}
          {image && (
            <div className="relative hidden h-28 w-24 shrink-0 overflow-hidden rounded-md bg-dc-cream sm:block">
              <Image src={image} alt="" fill sizes="96px" className="object-contain object-bottom" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
