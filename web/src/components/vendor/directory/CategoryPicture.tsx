import Image from "next/image";

import type { CategoryArt } from "./categoryArt";

/** A category picture filling its (relative) parent. Photos cover the frame;
 * cutouts stand on a warm studio ground with a soft floor shadow, the same
 * staging as the home page category index. */
export function CategoryPicture({
  art,
  sizes,
  priority = false,
  decorative = false,
  className = "",
}: {
  art: CategoryArt;
  sizes: string;
  priority?: boolean;
  /** Next to a visible label the picture adds nothing for screen readers. */
  decorative?: boolean;
  className?: string;
}) {
  const alt = decorative ? "" : art.alt;
  return art.studio ? (
    <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#fffaf0_0%,#efe3cc_55%,#d9c6a3_100%)] ${className}`}>
      <div aria-hidden className="absolute inset-x-[14%] bottom-[8%] h-[8%] rounded-[50%] bg-dc-ink/20 blur-xl" />
      <Image src={art.src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain p-[9%] pb-[10%]" />
    </div>
  ) : (
    <Image src={art.src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />
  );
}
