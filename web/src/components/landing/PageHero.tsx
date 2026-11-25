import Image from "next/image";
import Link from "next/link";

export type Crumb = { name: string; href?: string };

/** Compact light header for public inner pages ("Putih" system, Bridestory
 * style): breadcrumb, a bold sans title, one short line, optional actions and
 * an optional rounded photo on the right (under the text on phones). Replaces
 * the old full-bleed dark photo hero. The breadcrumb always starts at Beranda;
 * the last crumb is the current page. */
export function PageHero({
  crumbs,
  title,
  sub,
  image,
  imageAlt = "",
  focus = "50% 50%",
  actions,
  children,
  narrow = false,
}: {
  crumbs: Crumb[];
  title: React.ReactNode;
  sub?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  /** CSS object-position for the photo. */
  focus?: string;
  actions?: React.ReactNode;
  /** Extra row under the text (chips, facts). */
  children?: React.ReactNode;
  /** Centre the text in a reading column (articles). */
  narrow?: boolean;
}) {
  const all: Crumb[] = [{ name: "Beranda", href: "/" }, ...crumbs];
  const crumbsNav = (
    <nav aria-label="Jalur halaman">
      <ol className="flex flex-wrap items-center gap-x-1.5 text-sm text-wd-muted">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${c.name}-${i}`} className="flex items-center gap-x-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="inline-flex min-h-11 items-center hover:text-wd-ink hover:underline hover:underline-offset-4">
                  {c.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="inline-flex min-h-11 items-center font-medium text-wd-ink">
                  {c.name}
                </span>
              )}
              {!last && (
                <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );

  // No picture (reading pages): the compact white header.
  if (!image) {
    return (
      <header className="border-b border-wd-line bg-white">
        <div className={`wd-container pb-9 pt-5 sm:pb-12 sm:pt-6 ${narrow ? "max-w-[800px]" : ""}`}>
          {crumbsNav}
          <div className="mt-3 min-w-0">
            <h1 className="wd-title max-w-3xl text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.12]">{title}</h1>
            {sub && <p className="mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-wd-text">{sub}</p>}
            {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
            {children}
          </div>
        </div>
      </header>
    );
  }

  // Cover header (marketplace style): a wide rounded picture, and a white
  // title card that overlaps its lower edge, so the page opens on an image
  // while the text, buttons and chips stay on white (always readable).
  return (
    <header className="bg-white pb-8 sm:pb-10">
      <div className="wd-container pt-3 sm:pt-4">
        {crumbsNav}
        <div className="relative mt-1 h-[200px] overflow-hidden rounded-[24px] bg-wd-blush sm:h-[280px] sm:rounded-[28px] lg:h-[340px]">
          <Image src={image} alt={imageAlt} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" style={{ objectPosition: focus }} />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/15 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 -mt-14 mx-3 max-w-[760px] rounded-[22px] bg-white p-6 shadow-wd-pop sm:-mt-24 sm:ml-8 sm:mr-0 sm:p-8 lg:ml-12">
          <h1 className="wd-title text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.12]">{title}</h1>
          {sub && <p className="mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-wd-text">{sub}</p>}
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
          {children}
        </div>
      </div>
    </header>
  );
}
