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

/** The named presets of the motion system, in seconds. Same values as the
 * --dc-dur-* tokens in globals.css ("Motion system"), so CSS reveals and
 * framer-motion pieces move to one rhythm:
 * reveal (section arrives on scroll), stagger (items of one list), enter
 * (above the fold on load), route (dashboard page content after a navigation), panel (tab content swap),
 * crossfade (one picture replacing another in the same frame). */
export const MOTION = {
  reveal: 0.64,
  stagger: 0.52,
  staggerStep: 0.055,
  enter: 0.42,
  route: 0.26,
  panel: 0.28,
  crossfade: 0.6,
} as const;

/** Crossfade for a picture replaced in the same frame (device screens,
 * hero worlds): the new one fades in ON TOP while the old one stays opaque
 * underneath, then leaves. Both never sit half transparent at once, so the
 * frame never dips into a washed-out double image. Pair with
 * <AnimatePresence initial={false}> and a `key` per picture. */
export function dissolve(reduced: boolean | null, duration: number = MOTION.crossfade) {
  if (reduced) {
    return { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.01 } }, exit: { opacity: 0, transition: { duration: 0.01 } } } as const;
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration, ease: EASE_IN_OUT } },
    exit: { opacity: 0, transition: { duration: 0.01, delay: duration } },
  } as const;
}

/** Physics for pointer-driven parallax and magnetic hover. */
export const SPRING_SOFT = { stiffness: 50, damping: 18, mass: 1 } as const;
export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 32 } as const satisfies Transition;

/** One item of a list arriving (stagger preset): rises 14px. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION.stagger, ease: EASE } },
};

export const blurReveal: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: MOTION.reveal, ease: EASE } },
};

/** Parent for lists: children enter one after another (use with fadeUp). */
export const staggerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: MOTION.staggerStep, delayChildren: 0.04 } },
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
