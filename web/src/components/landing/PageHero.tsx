import Image from "next/image";

/** Shared photo header for public inner pages. The flat ink veil (not a
 * decorative gradient) keeps white text above AA contrast on any photo. */
export function PageHero({
  title,
  subtitle,
  image,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-dc-ink">
      <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-dc-ink/65" aria-hidden />
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-36 sm:px-6 lg:px-10 lg:pb-20 lg:pt-44">
        <h1 className="max-w-3xl font-heading text-5xl leading-[1] text-dc-white sm:text-7xl">{title}</h1>
        {subtitle && <p className="mt-5 max-w-xl text-lg text-dc-white/85">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
