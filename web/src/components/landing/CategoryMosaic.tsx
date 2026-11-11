"use client";

// The seven vendor categories as an editorial photo bento: venue (the first
// and biggest decision) is the hero tile, decor and photo are wide, the rest
// square, so size follows how couples plan. Each tile opens /kategori/<value>.
// The vendor count appears only once the public directory has loaded and the
// category really has vendors (antislop R-17), and counts up when seen.
//
// Pictures: real Indonesian wedding photos from Wikimedia Commons
// (public/photos/kategori, credited on /kredit).
//
// Motion purpose: hover, focus or touch gives depth (photo zooms, tile lifts,
// the arrow after "Lihat vendor" steps forward) which says "this opens"; the bento enters
// in a stagger so it reads as one set. Reduced motion: shadow only.
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { Counting } from "@/components/landing/Counting";
import { Reveal } from "@/components/landing/Reveal";
import { useDirectory } from "@/components/landing/useHomeData";
import { VENDOR_CATEGORIES } from "@/lib/api";

type Pic = { src: string; alt: string; studio?: boolean; note: string; tile: string; sizes: string };

const BIG = "(min-width: 1024px) 50vw, 100vw";
const WIDE = "(min-width: 1024px) 50vw, 50vw";
const SQUARE = "(min-width: 1024px) 25vw, 50vw";

const PICS: Record<string, Pic> = {
  venue: { src: "/photos/kategori/venue-1400.webp", alt: "Gedung resepsi pernikahan di Jakarta dengan lampu gantung dan lorong bunga menuju pelaminan", note: "Gedung, ballroom, taman, rumah adat", tile: "col-span-2 aspect-square sm:aspect-[16/10] lg:aspect-auto lg:row-span-2", sizes: BIG },
  mua_attire: { src: "/photos/kategori/rias-1400.webp", alt: "Riasan pengantin putri Jember Pendalungan dengan mahkota emas dan untaian melati", note: "Rias, busana adat, gaun", tile: "aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto", sizes: SQUARE },
  catering: { src: "/photos/kategori/katering-1400.webp", alt: "Tumpeng nasi kuning dengan lauk pauk lengkap di atas daun pisang", note: "Prasmanan, gubukan, menu adat", tile: "aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto", sizes: SQUARE },
  decor: { src: "/photos/kategori/dekorasi-1400.webp", alt: "Pelaminan adat Minangkabau berukir emas dengan kursi pengantin merah", note: "Pelaminan, gapura, bunga, lampu", tile: "aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto lg:col-span-2", sizes: WIDE },
  photo_video: { src: "/photos/kategori/foto-1400.webp", alt: "Potret pengantin Bali bermahkota emas saat upacara pernikahan", note: "Foto, video, prewedding", tile: "aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto lg:col-span-2", sizes: WIDE },
  entertainment: { src: "/photos/kategori/hiburan-1400.webp", alt: "Pemain gamelan Jawa tampil di Yogyakarta", note: "Musik, MC, hiburan adat", tile: "aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto", sizes: SQUARE },
  invitation_souvenir: { src: "/photos/kategori/suvenir-1400.webp", alt: "Undangan pernikahan cetak berhias bunga mawar, dengan amplopnya", note: "Undangan cetak, suvenir", tile: "aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto", sizes: SQUARE },
};

// Desktop order fills the 4 x 3 grid exactly (venue 2x2, decor and photo 2x1).
const ORDER = ["venue", "mua_attire", "catering", "decor", "photo_video", "entertainment", "invitation_souvenir"];

const ZOOM = "transition-transform duration-[1.1s] ease-dc group-hover:scale-[1.08] group-focus-visible:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover:scale-100";

function Picture({ pic }: { pic: Pic }) {
  return pic.studio ? (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#fffaf0_0%,#efe3cc_55%,#d9c6a3_100%)]">
      <Image src={pic.src} alt={pic.alt} fill sizes={pic.sizes} className={`object-contain p-[8%] pb-[30%] ${ZOOM}`} />
    </div>
  ) : (
    <Image src={pic.src} alt={pic.alt} fill sizes={pic.sizes} className={`object-cover ${ZOOM}`} />
  );
}

export function CategoryMosaic() {
  const directory = useDirectory();
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    if (directory.status === "ready") for (const c of directory.data ?? []) m[c.category] = (m[c.category] ?? 0) + 1;
    return m;
  }, [directory]);

  return (
    <section aria-labelledby="kategori-judul" className="dc-grain relative overflow-hidden bg-dc-ivory">
      <div className="mx-auto max-w-[1440px] px-3 py-20 sm:px-6 sm:py-28 lg:px-10 lg:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="dc-eyebrow justify-center">Tujuh kategori vendor</p>
          <h2 id="kategori-judul" className="mt-4 font-heading text-[clamp(2.5rem,5.4vw,4.8rem)] leading-[1] text-dc-ink">
            Semua untuk hari-H, <span className="dc-em">satu direktori.</span>
          </h2>
        </Reveal>

        <Reveal>
          <ul className="dc-stagger mt-10 grid grid-cols-2 gap-2.5 sm:gap-4 lg:mt-16 lg:auto-rows-[clamp(15rem,20vw,19rem)] lg:grid-cols-4">
            {ORDER.map((value) => {
              const pic = PICS[value];
              const label = VENDOR_CATEGORIES.find((c) => c.value === value)?.label ?? value;
              const n = counts[value] ?? 0;
              const hero = value === "venue";
              return (
                <li key={value} className={pic.tile}>
                  <Link
                    href={`/kategori/${value}`}
                    className="group relative block h-full overflow-hidden rounded-2xl bg-dc-cream shadow-soft transition-[transform,box-shadow] duration-500 ease-dc hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold active:scale-[0.985] motion-safe:hover:-translate-y-1.5"
                  >
                    <Picture pic={pic} />
                    <div aria-hidden className="absolute inset-x-0 bottom-0 h-[78%] bg-linear-to-t from-dc-ink via-dc-ink/80 to-transparent" />
                    {n > 0 && (
                      <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-dc-white px-3 py-1 text-xs font-semibold tabular-nums text-dc-ink shadow-soft sm:left-4 sm:top-4">
                        <Counting value={n} />
                        &nbsp;vendor
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 flex flex-col p-4 sm:p-5 lg:p-7">
                      <span className={`font-heading leading-[1.02] text-[#fbf6ec] ${hero ? "text-[clamp(2.2rem,4.6vw,4rem)]" : "text-[clamp(1.5rem,2.3vw,2.1rem)]"}`}>{label}</span>
                      <span className={`mt-1 leading-snug text-[#fbf6ec] ${hero ? "text-base" : "text-sm"} ${hero ? "" : "hidden sm:block"}`}>{pic.note}</span>
                      <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-dc-gold-antique">
                        Lihat vendor
                        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform duration-500 ease-dc group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5 motion-reduce:transition-none">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
