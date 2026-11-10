"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

const TABS = [
  { href: "/client/wedding-planner", label: "Persiapan", icon: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" },
  { href: "/client/wedding-planner/guests", label: "Tamu & RSVP", icon: "M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3M15.5 4.2a3.5 3.5 0 0 1 0 6.6" },
  { href: "/client/wedding-planner/rundown", label: "Rundown", icon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/client/wedding-planner/seating", label: "Denah meja", icon: "M12 15a6 3 0 1 0 0-6 6 3 0 0 0 0 6ZM6 12v6M18 12v6M3 7l2 2M21 7l-2 2M12 4v2" },
];

/** Sub-navigation shared by the four Wedding Planner pages: one feature area
 * under a single CLIENT_NAV entry. A segmented pill row on a champagne track;
 * the ink indicator slides to the active page (shared layout motion tells the
 * couple they moved within the same planner, not to a new place). Scrolls
 * inside its own track on narrow screens, never the page. */
export function WeddingPlannerTabs() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <nav aria-label="Wedding Planner" className="-mx-4 mb-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="inline-flex min-w-max gap-1 rounded-full border border-dc-line bg-dc-cream p-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="relative">
              {active && (
                <motion.span
                  layoutId={reduced ? undefined : "planner-tab"}
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-dc-ink shadow-soft"
                />
              )}
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200 sm:px-5 ${
                  active ? "text-dc-on-dark" : "text-dc-text-2 hover:bg-dc-white/70 hover:text-dc-ink"
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={active ? "text-dc-gold-antique" : ""}>
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
