"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * A real wedding photo floating at a section's edge, drifting as the page
 * scrolls past it. Each instance moves at its own speed/tilt so the photos
 * feel scattered through the page rather than parked in one hero banner.
 * Scroll-linked (not a one-shot entrance), scoped to this element's own
 * scroll range so it never depends on the rest of the page.
 */
export function ParallaxImage({
  src,
  alt,
  className = "",
  speed = 40,
  rotate = 0,
  interactive = false,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Pixels of drift from top to bottom of this element's scroll range. */
  speed?: number;
  /** Degrees of tilt at rest; scroll adds a few more degrees on top. */
  rotate?: number;
  /**
   * Opt-in pointer tilt + hover scale, for the one deliberate interactive
   * photo on a section. Every other instance stays decorative and
   * pointer-events-none — this isn't meant to be turned on everywhere.
   */
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  const rotation = useTransform(scrollYProgress, [0, 1], [rotate - 3, rotate + 3]);

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const tiltX = useSpring(useTransform(pointerY, [0, 1], [12, -12]), { stiffness: 220, damping: 20 });
  const tiltY = useSpring(useTransform(pointerX, [0, 1], [-12, 12]), { stiffness: 220, damping: 20 });

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width);
    pointerY.set((e.clientY - rect.top) / rect.height);
  }

  function handlePointerLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      aria-hidden={!interactive}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={interactive && !reduced ? { scale: 1.08 } : undefined}
      className={`absolute ${interactive ? "" : "pointer-events-none"} ${className}`}
      style={
        reduced
          ? { rotate }
          : interactive
            ? { y, rotate: rotation, rotateX: tiltX, rotateY: tiltY, transformPerspective: 800 }
            : { y, rotate: rotation }
      }
    >
      <Image src={src} alt={alt} fill sizes="280px" className="object-contain object-bottom drop-shadow-[0_24px_32px_rgba(0,0,0,0.25)]" />
    </motion.div>
  );
}
