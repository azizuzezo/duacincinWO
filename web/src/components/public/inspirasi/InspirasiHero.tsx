"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

// Couples from the DuaCincin Pinterest board (credited on /kredit), one per
// arch window, laid out as a gentle arc: the outer arches sit lower and drift slower.
const ARCHES = [
  { src: "/photos/pasangan/pin-minang.webp", label: "Minang", alt: "Pengantin Minang bersuntiang emas", rotate: -7, speed: 0.45, drop: "mt-20 sm:mt-24", wide: true, focus: "object-[50%_18%]" },
  { src: "/photos/pinterest/rias-hijab.webp", label: "Modern", alt: "Pengantin berhijab cokelat dengan mahkota bunga emas", rotate: -3, speed: 0.7, drop: "mt-8 sm:mt-10", wide: false, focus: "object-[50%_18%]" },
  { src: "/photos/pasangan/pin-akad.webp", label: "Akad", alt: "Pasangan berbusana putih duduk di pelaminan bunga putih saat akad", rotate: 0, speed: 1, drop: "mt-0", wide: false, focus: "object-[50%_40%]" },
  { src: "/photos/pinterest/pasangan-internasional.webp", label: "Internasional", alt: "Pasangan bergaun putih dan jas hitam di antara bunga putih", rotate: 3, speed: 0.7, drop: "mt-8 sm:mt-10", wide: false, focus: "object-[50%_30%]" },
  { src: "/photos/pasangan/pin-melayu.webp", label: "Melayu", alt: "Pasangan pengantin Melayu", rotate: 7, speed: 0.45, drop: "mt-20 sm:mt-24", wide: true, focus: "object-[50%_18%]" },
];

function Arch({ a, i, progress, reduced }: { a: (typeof ARCHES)[number]; i: number; progress: MotionValue<number>; reduced: boolean }) {
  const y = useTransform(progress, [0, 1], [0, reduced ? 0 : -90 * a.speed]);
  return (
    <motion.figure
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.9, ease: EASE, delay: reduced ? 0 : 0.1 + Math.abs(i - 2) * 0.1 }}
      className={`relative w-[32%] max-w-[250px] shrink-0 sm:w-[19%] ${a.drop} ${a.wide ? "hidden sm:block" : ""} ${i === 2 ? "z-10" : ""} -mx-1.5 sm:-mx-2`}
    >
      <motion.div style={{ y, rotate: a.rotate }}>
        <div className="relative aspect-[3/4.4] overflow-hidden rounded-t-full border-[5px] border-dc-white bg-[radial-gradient(120%_80%_at_50%_100%,#e9d6ad_0%,#f3ecdf_55%,#faf6ef_100%)] shadow-lift">
          <Image
            src={a.src}
            alt={a.alt}
            fill
            sizes="(min-width: 1024px) 250px, (min-width: 640px) 19vw, 32vw"
            priority={i >= 1 && i <= 3}
            className={`object-cover ${a.focus}`}
          />
        </div>
        <figcaption className="mt-3 text-center font-heading text-lg text-dc-text-2">{a.label}</figcaption>
      </motion.div>
    </motion.figure>
  );
}

/** Paper-editorial opening for the gallery: a big centred headline over an
 * arc of five arch windows with real couples (three on phones). Motion
 * purpose: the arches rise in from the centre outwards, then drift up at
 * different speeds on scroll, a depth cue that leads the eye into the board. */
export function InspirasiHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  return (
    <section ref={ref} className="dc-grain relative overflow-hidden bg-dc-ivory">
      <div className="dc-container pb-12 pt-12 text-center sm:pt-16 lg:pb-16 lg:pt-20">
        <p className="dc-eyebrow animate-fade-up justify-center">Galeri inspirasi</p>
        <h1 className="mx-auto mt-5 max-w-4xl animate-fade-up font-heading text-[clamp(2.7rem,6.4vw,5.75rem)] leading-[0.96] text-dc-ink">
          Pernikahan Indonesia yang <span className="dc-em">nyata dan bisa ditiru.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-dc-text-2">
          Kurasi dari{" "}
          <a
            href={PINTEREST_BOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-dc-clay underline decoration-dc-gold/50 underline-offset-4 hover:decoration-dc-clay"
          >
            papan Pinterest resmi DuaCincin
          </a>
          . Pilih adat atau kategori, lalu ketuk foto untuk melihatnya lebih besar.
        </p>
        <div className="mt-12 flex items-start justify-center sm:mt-14">
          {ARCHES.map((a, i) => (
            <Arch key={a.label} a={a} i={i} progress={scrollYProgress} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  );
}
