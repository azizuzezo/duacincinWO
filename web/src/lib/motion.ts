// Shared framer-motion variants — one place for new components to pull
// consistent motion from, instead of every file (Hero.tsx, etc.) defining
// its own animation inline. Existing components aren't migrated to this by
// this change; it's the pattern new UI (Modal, Toast, and beyond) builds on.
export { useReducedMotion } from "framer-motion";

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const staggerList = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.12 } },
};

export const slideIn = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: 24, transition: { duration: 0.15 } },
};

// Motion-respecting variants collapse to an instant, no-motion state —
// pass these instead of the variants above when useReducedMotion() is true.
export const reducedMotionOverride = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};
