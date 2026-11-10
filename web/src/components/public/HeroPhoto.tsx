"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { useReducedMotion } from "@/lib/motion";

/** Full-bleed photo layer of PageHero. Motion purpose: the photo sinks
 * slower than the page scrolls (layered parallax), so the headline lifts
 * off the picture like a printed card over a photograph. Off under reduced
 * motion. */
export function HeroPhoto({ src, focus = "50% 50%" }: { src: string; focus?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
      <motion.div style={reduced ? undefined : { y }} className="absolute inset-x-0 -top-[4%] h-[112%]">
        <Image src={src} alt="" fill priority sizes="100vw" className="dc-kenburns object-cover" style={{ objectPosition: focus }} />
      </motion.div>
    </div>
  );
}
