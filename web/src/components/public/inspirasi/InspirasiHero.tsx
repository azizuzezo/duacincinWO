"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { useReducedMotion } from "@/lib/motion";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

// The owner's real couple cutouts (public/hero/adat), one per arch window.
const ARCHES = [
  { key: "minang", label: "Minang", rotate: -5, speed: 0.6 },
  { key: "jawa", label: "Jawa", rotate: 0, speed: 1 },
  { key: "bugis", label: "Bugis", rotate: 5, speed: 0.75 },
];

function Arch({ a, i, progress, reduced }: { a: (typeof ARCHES)[number]; i: number; progress: MotionValue<number>; reduced: boolean }) {
  const y = useTransform(progress, [0, 1], [0, -70 * a.speed]);
  return (
    <motion.figure
      style={reduced ? { rotate: a.rotate } : { y, rotate: a.rotate }}
      className={`relative w-[31%] max-w-[210px] shrink-0 ${i === 1 ? "z-10 -mx-3 sm:-mx-4" : "mt-10 sm:mt-14"}`}
    >
      <div className="relative aspect-[3/4.4] overflow-hidden rounded-t-full border-[5px] border-dc-white bg-[radial-gradient(120%_80%_at_50%_100%,#e9d6ad_0%,#f3ecdf_55%,#faf6ef_100%)] shadow-lift">
        <Image
          src={`/hero/adat/${a.key}.webp`}
          alt={`Pasangan berbusana adat ${a.label}`}
          fill
          sizes="(min-width: 1024px) 210px, 30vw"
          priority={i === 1}
          className="object-cover object-[50%_18%]"
        />
      </div>
      <figcaption className="mt-3 text-center font-heading text-lg text-dc-text-2">{a.label}</figcaption>
    </motion.figure>
  );
}

/** Paper-editorial opening for the gallery (deliberately not another dark
 * photo banner): headline left, three arch windows with real adat couples
 * right. Motion purpose: the arches drift up at different speeds on scroll,
 * a quiet depth cue that leads the eye down into the gallery. */
export function InspirasiHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  return (
    <section ref={ref} className="dc-grain relative overflow-hidden bg-dc-ivory">
      <div className="dc-container grid items-center gap-10 pb-12 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-12 lg:pb-16 lg:pt-16">
        <div className="lg:col-span-6">
          <p className="dc-eyebrow animate-fade-up">Galeri inspirasi</p>
          <h1 className="mt-5 animate-fade-up font-heading text-[clamp(2.6rem,5.6vw,4.9rem)] leading-[0.98] text-dc-ink">
            Pernikahan Indonesia yang <span className="dc-em">nyata dan bisa ditiru.</span>
          </h1>
          <p className="mt-6 max-w-lg animate-fade-up text-lg leading-relaxed text-dc-text-2">
            Kurasi langsung dari{" "}
            <a
              href={PINTEREST_BOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-dc-clay underline decoration-dc-gold/50 underline-offset-4 hover:decoration-dc-clay"
            >
              papan Pinterest resmi DuaCincin
            </a>
            . Foto di galeri ini dari pernikahan sungguhan. Pilih adat atau kategori, lalu ketuk foto untuk melihatnya lebih besar.
          </p>
        </div>
        <div className="flex items-start justify-center lg:col-span-6 lg:justify-end">
          {ARCHES.map((a, i) => (
            <Arch key={a.key} a={a} i={i} progress={scrollYProgress} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  );
}
