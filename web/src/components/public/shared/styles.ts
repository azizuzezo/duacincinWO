// Shared hover vocabulary for the public content pages ("Putih").
// Purpose: a card that can be opened says so before the click: it rises a
// little and its photo leans in. Both stop under prefers-reduced-motion.

/** Card that lifts on hover / keyboard focus (put on the link or card). */
export const LIFT =
  "transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-wd-lift focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0";

/** Photo inside a `group` that zooms slowly while the group is hovered. */
export const ZOOM =
  "object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] group-focus-visible:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100";
