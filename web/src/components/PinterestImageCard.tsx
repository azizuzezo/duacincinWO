/**
 * A real Pinterest pin's image, in our own card styling (not Pinterest's
 * embed widget): full layout control and one consistent credit treatment.
 * Every card still credits and links back to the source pin on Pinterest.
 * The credit link is always visible (touch and keyboard users have no hover).
 */
export function PinterestImageCard({
  imageUrl,
  pinUrl,
  alt = "Inspirasi pernikahan dari Pinterest",
}: {
  imageUrl: string;
  pinUrl: string;
  alt?: string;
}) {
  return (
    <figure className="group mb-4 break-inside-avoid overflow-hidden rounded-lg border border-dc-ink/10 bg-dc-white">
      <div className="overflow-hidden bg-dc-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          className="w-full transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <figcaption>
        <a
          href={pinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2 px-3 text-xs font-medium text-dc-black/70 transition-colors hover:text-dc-clay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-dc-gold"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
            <path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-.94-.11-2.38.02-3.4.12-.94.79-6 .79-6s-.2-.4-.2-1c0-.94.55-1.64 1.23-1.64.58 0 .86.44.86.96 0 .59-.37 1.46-.57 2.28-.16.68.34 1.24 1.02 1.24 1.22 0 2.05-1.57 2.05-3.42 0-1.41-.95-2.46-2.68-2.46-1.95 0-3.17 1.46-3.17 3.09 0 .56.16 .96.42 1.27.12.14.13.2.09.36l-.15.6c-.05.19-.19.24-.44.14-1.22-.5-1.79-1.83-1.79-3.33 0-2.48 2.09-5.45 6.24-5.45 3.33 0 5.52 2.41 5.52 5 0 3.42-1.9 5.98-4.7 5.98-.94 0-1.82-.5-2.12-1.08l-.6 2.36c-.19.72-.55 1.62-.84 2.19A12 12 0 1 0 12 0Z" />
          </svg>
          Lihat di Pinterest
        </a>
      </figcaption>
    </figure>
  );
}
