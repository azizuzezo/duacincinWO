import { HeroPhoto } from "@/components/public/HeroPhoto";

/** Shared photo header for public inner pages (under the Navbar overlay).
 * The ink grade is deepest where the words are (bottom on phones, left on
 * desktop) and lightest on the right, so the photo stays visible; a thin top
 * scrim keeps the overlay navbar readable (contrast audited). `aside` adds a right-hand column on desktop (it stacks
 * under the copy on phones). The photo has a slow ken burns and a scroll
 * parallax, both off under reduced motion. */
export function PageHero({
  title,
  subtitle,
  image,
  eyebrow,
  focus,
  aside,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image: string;
  /** Short section label above the headline, with the ring motif. */
  eyebrow?: string;
  /** CSS object-position for the photo, e.g. "70% 40%". */
  focus?: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="dc-on-dark relative isolate overflow-hidden bg-dc-ink">
      <HeroPhoto src={image} focus={focus} />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(14,10,7,0.7)_0%,rgba(14,10,7,0)_20%),linear-gradient(0deg,rgba(14,10,7,0.94)_0%,rgba(14,10,7,0.84)_50%,rgba(14,10,7,0.66)_100%)] lg:bg-[linear-gradient(180deg,rgba(14,10,7,0.72)_0%,rgba(14,10,7,0)_22%),linear-gradient(90deg,rgba(14,10,7,0.92)_0%,rgba(14,10,7,0.84)_45%,rgba(14,10,7,0.5)_72%,rgba(14,10,7,0.3)_100%),linear-gradient(0deg,rgba(14,10,7,0.55)_0%,rgba(14,10,7,0)_38%)]"
      />
      <div className={`dc-container pb-14 pt-32 sm:pt-36 lg:pb-24 lg:pt-44 ${aside ? "grid items-end gap-10 lg:grid-cols-12" : ""}`}>
        <div className={aside ? "lg:col-span-7" : ""}>
          {eyebrow && <p className="dc-eyebrow is-light mb-5 animate-fade-up">{eyebrow}</p>}
          <h1 className="max-w-3xl animate-fade-up font-heading text-[clamp(2.6rem,6vw,5.25rem)] leading-[0.98] text-dc-on-dark">{title}</h1>
          {subtitle && <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-dc-on-dark/85">{subtitle}</p>}
          {children}
        </div>
        {aside && <div className="lg:col-span-5">{aside}</div>}
      </div>
    </section>
  );
}
