import Image from "next/image";

// Real WO screens (web/public/showcase/pages, captured from the app with the
// harness demo data) shown inside a device, so a reader sees the product
// itself instead of a description of it. Both frames reserve their aspect
// ratio up front, so nothing shifts while the screenshot loads.

/** Phone screenshots are 390x844 CSS px (captured at 2x, stored 600x1298). */
export const PHONE_RATIO = "390 / 844";

/** Ink phone body with a soft gold rim. `crop` shows only the top part of the
 * screen (for inline thumbnails on small screens) with a fade at the bottom. */
export function PhoneFrame({
  src,
  alt,
  className = "",
  sizes = "300px",
  priority = false,
  crop,
  fade = "from-dc-ivory",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Visible screen ratio when cropping, e.g. "390 / 560". */
  crop?: string;
  /** Gradient start class matching the surface under a cropped phone. */
  fade?: string;
}) {
  return (
    <div className={`rounded-[2.4rem] bg-dc-ink p-[7px] shadow-float ring-1 ring-dc-gold/30 ${className}`}>
      <div className="relative overflow-hidden rounded-[1.95rem] bg-dc-ivory" style={{ aspectRatio: crop ?? PHONE_RATIO }}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
        {crop && <span aria-hidden className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${fade} to-transparent`} />}
        <span aria-hidden className="absolute left-1/2 top-1.5 h-3 w-[18%] -translate-x-1/2 rounded-full bg-dc-ink" />
      </div>
    </div>
  );
}

/** Desktop browser window (1280x800 captures, stored 1400x875). */
export function BrowserFrame({
  src,
  alt,
  className = "",
  sizes = "(min-width: 1024px) 760px, 100vw",
  priority = false,
  address = "duacincin.id",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  address?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-dc-line-strong bg-dc-white shadow-float ${className}`}>
      <div aria-hidden className="flex h-8 items-center gap-1.5 border-b border-dc-line bg-dc-cream px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-dc-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-dc-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-dc-line-strong" />
        <span className="ml-3 hidden h-5 flex-1 items-center rounded-md bg-dc-white px-3 text-[11px] text-dc-text-3 sm:flex">{address}</span>
      </div>
      <div className="relative bg-dc-ivory" style={{ aspectRatio: "1280 / 800" }}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
      </div>
    </div>
  );
}
