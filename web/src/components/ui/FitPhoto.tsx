import Image from "next/image";

/** A vendor photo shown whole, never cropped. Portfolio photos arrive in
 * every aspect ratio (phone portraits to wide group shots), so a fixed
 * card shape with object-cover can silently cut away more than half of a
 * photo (a 3:4 portrait loses 43% of its height in a square, 58% in 4:3).
 * FitPhoto instead fits the photo (object-contain) over a blurred,
 * slightly enlarged copy of itself that fills the card: no part of the
 * photo is lost, the card keeps its uniform shape, and the letterbox
 * area reads as the photo's own ambient colour. The copy reuses the
 * same URL (one download) and is decorative (empty alt).
 *
 * Render inside a positioned, overflow-hidden parent that owns the aspect
 * ratio and rounding. Motion classes (hover zooms, fades) go on the
 * fitted photo via `className`; the blurred copy never moves. */
export function FitPhoto({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <>
      <Image aria-hidden src={src} alt="" fill unoptimized sizes={sizes} className="scale-[1.25] object-cover blur-2xl" />
      <Image src={src} alt={alt} fill unoptimized sizes={sizes} priority={priority} className={`object-contain ${className}`} />
    </>
  );
}
