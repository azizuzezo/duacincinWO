// Shared motion vocabulary (framer-motion). Every animation in the app pulls
// its curve, duration and variants from here so the whole product moves the
// same way as invitation.duacincin.id. Purpose of each pattern is in
// DESIGN.md "Gerak". Always branch on useReducedMotion(): pass
// `reducedMotionOverride` (opacity only, instant) when it returns true.
import type { Transition, Variants } from "framer-motion";

export { useReducedMotion } from "framer-motion";

/** The brand curve: fast out, long settle. Same as --dc-ease in globals.css. */
export const EASE = [0.16, 1, 0.3, 1] as const;
/** Symmetric curve for crossfades and clip reveals. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = { fast: 0.18, base: 0.5, slow: 0.9, scene: 1.4 } as const;

/** Physics for pointer-driven parallax and magnetic hover. */
export const SPRING_SOFT = { stiffness: 50, damping: 18, mass: 1 } as const;
export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 32 } as const satisfies Transition;

/** Scroll reveal for a block: rises 14px out of a light blur. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
};

export const blurReveal: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: DURATION.slow, ease: EASE } },
};

/** Parent for lists: children enter one after another (use with fadeUp). */
export const staggerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** Headline lines: each line rises from under its own mask. */
export const lineRise: Variants = {
  hidden: { y: "105%" },
  visible: (i: number = 0) => ({ y: "0%", transition: { duration: DURATION.slow, ease: EASE, delay: 0.08 * i } }),
};

/** Dialog / popover. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.24, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.14 } },
};

/** Toast / side panel from the right. */
export const slideIn: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: EASE } },
  exit: { opacity: 0, x: 24, transition: { duration: 0.15 } },
};

/** Mobile bottom sheet. */
export const sheetUp: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { duration: 0.42, ease: EASE } },
  exit: { y: "100%", transition: { duration: 0.24, ease: EASE_IN_OUT } },
};

/** Collapse every variant set to an instant opacity change. */
export const reducedMotionOverride: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

/** Pick the right variants in one line: `variants={motionSafe(reduced, scaleIn)}`. */
export function motionSafe(reduced: boolean | null, variants: Variants): Variants {
  return reduced ? reducedMotionOverride : variants;
}
