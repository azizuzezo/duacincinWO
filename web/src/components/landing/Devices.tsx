import Image from "next/image";

// Device frames for real product captures (public/showcase/*). Drawn in CSS
// so they stay sharp and light; the screen is the capture itself. Laptop
// captures are 1280x800 (16:10), phone captures 640x1385 (390x844 viewport at
// 2x, same ratio as the DuaCincin Undangan previews).

export function PhoneFrame({
  src,
  alt,
  sizes = "(min-width: 1024px) 280px, 60vw",
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
    <div className={`rounded-[2.4rem] bg-dc-ink p-[3.2%] shadow-float ring-1 ring-dc-ink-3 ${className}`}>
      <div className="relative aspect-[640/1385] overflow-hidden rounded-[2rem] bg-dc-ivory">
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
        <span aria-hidden className="absolute left-1/2 top-[1.4%] h-[2.6%] w-[30%] -translate-x-1/2 rounded-full bg-dc-ink" />
      </div>
    </div>
  );
}

export function LaptopFrame({ src, alt, sizes = "(min-width: 1024px) 760px, 90vw", className = "" }: { src: string; alt: string; sizes?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="rounded-t-[1.1rem] bg-dc-ink p-[1.6%] pb-[2%] shadow-float ring-1 ring-dc-ink-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[0.35rem] bg-dc-ivory">
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover object-top" />
        </div>
      </div>
      <div aria-hidden className="relative mx-[-5%] h-3 rounded-b-[1.2rem] bg-linear-to-b from-dc-paper-3 to-dc-line-strong shadow-soft sm:h-4">
        <span className="absolute left-1/2 top-0 h-1.5 w-[16%] -translate-x-1/2 rounded-b-md bg-dc-line-strong" />
      </div>
    </div>
  );
}
