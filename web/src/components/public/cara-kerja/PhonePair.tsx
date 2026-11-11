"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

import { PhoneFrame } from "@/components/ui/DeviceFrame";

type Shot = { src: string; alt: string };

/** Two real screens, one behind the other. Motion purpose: layered parallax,
 * the back phone drifts slower than the front one as the page scrolls, so the
 * pair reads as objects in space over the hero, not a flat picture. They also
 * rise in once on load. Static under reduced motion. */
export function PhonePair({ back, front, className = "" }: { back: Shot; front: Shot; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yBack = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -60]);
  const yFront = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -120]);

  return (
    <div ref={ref} className={`relative mx-auto aspect-[4/5] w-full max-w-[460px] ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.9, ease: EASE, delay: reduced ? 0 : 0.15 }}
        className="absolute left-[3%] top-0 w-[46%]"
      >
        <motion.div style={{ y: yBack }} className="-rotate-[5deg]">
          <PhoneFrame src={back.src} alt={back.alt} sizes="220px" priority />
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.9, ease: EASE, delay: reduced ? 0 : 0.3 }}
        className="absolute right-[3%] top-[9%] w-[50%]"
      >
        <motion.div style={{ y: yFront }} className="rotate-[4deg]">
          <PhoneFrame src={front.src} alt={front.alt} sizes="240px" priority />
        </motion.div>
      </motion.div>
    </div>
  );
}
