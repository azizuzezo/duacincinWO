import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";
import { VENDOR_CATEGORIES } from "@/lib/api";

// Placeholder stock photo per category (see public/stock/README.md). Layout is
// an explicit 12-column mosaic: wide tiles for the biggest budget lines (Venue
// & Catering is 40% of the default split, Dekorasi 15%), text-only cards for
// categories with no suitable photo yet. Tiles differ in width on purpose.
const LAYOUT: { value: string; span: string; photo?: { src: string; alt: string } }[] = [
  { value: "venue", span: "lg:col-span-7", photo: { src: "/stock/ballroom.webp", alt: "Ballroom dengan meja bundar dan rangkaian bunga" } },
  { value: "decor", span: "lg:col-span-5", photo: { src: "/stock/stairs-flowers.webp", alt: "Tangga berhias bunga dan lentera" } },
  { value: "photo_video", span: "lg:col-span-5", photo: { src: "/stock/photographer.webp", alt: "Fotografer memotret pasangan pengantin" } },
  { value: "mua_attire", span: "lg:col-span-7", photo: { src: "/stock/couple-studio.webp", alt: "Pasangan pengantin berbusana putih" } },
  { value: "entertainment", span: "lg:col-span-6", photo: { src: "/stock/chandelier.webp", alt: "Chandelier kristal di atas rangkaian bunga putih" } },
  { value: "catering", span: "lg:col-span-3" },
  { value: "invitation_souvenir", span: "lg:col-span-3" },
];

export function CategoryStrip() {
  return (
    <section aria-labelledby="kategori-judul" className="bg-dc-ivory">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="kategori-judul" className="max-w-2xl font-heading text-4xl leading-[1.05] text-dc-ink sm:text-6xl">
            Tujuh kategori, <span className="dc-em">satu direktori.</span>
          </h2>
          <Link href="/vendors" className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
            Lihat semua vendor
          </Link>
        </Reveal>

        <ul className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {LAYOUT.map((tile) => {
            const cat = VENDOR_CATEGORIES.find((c) => c.value === tile.value);
            if (!cat) return null;
            const href = `/vendors?category=${cat.value}`;
            return tile.photo ? (
              <li key={cat.value} className={`relative min-h-64 overflow-hidden rounded-lg bg-dc-ink lg:min-h-72 ${tile.span}`}>
                <Link href={href} className="group absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-dc-white">
                  <Image src={tile.photo.src} alt={tile.photo.alt} fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none" />
                  <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-dc-ink/85 to-transparent p-5 pt-20 font-heading text-3xl text-dc-white">
                    {cat.label}
                  </span>
                </Link>
              </li>
            ) : (
              <li key={cat.value} className={tile.span}>
                <Link
                  href={href}
                  className="flex h-full min-h-24 items-end rounded-lg border border-dc-ink/15 bg-dc-white p-5 lg:min-h-72 font-heading text-3xl text-dc-ink transition-colors hover:border-dc-ink hover:bg-dc-ink hover:text-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
                >
                  {cat.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
