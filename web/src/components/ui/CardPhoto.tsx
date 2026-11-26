import Image from "next/image";

/** Vendor portfolio photo for a card: fills the frame, focused on the upper
 * part where faces and headpieces are. Frames for vendor cards are 4:5
 * (tall) because most portfolio photos are portraits, so little is cut; wide
 * photos lose some of their sides. No blur and no letterbox bars.
 *
 * Render inside a positioned, overflow-hidden parent that owns the aspect
 * ratio and rounding. Motion classes (hover zoom) go in `className`. */
export function CardPhoto({
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
  return <Image src={src} alt={alt} fill unoptimized sizes={sizes} priority={priority} className={`object-cover object-[50%_22%] ${className}`} />;
}
