"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

const TABS = [
  { href: "/client/wedding-planner", label: "Persiapan" },
  { href: "/client/wedding-planner/guests", label: "Tamu & RSVP" },
  { href: "/client/wedding-planner/rundown", label: "Rundown" },
  { href: "/client/wedding-planner/seating", label: "Denah meja" },
];

/** Sub-navigation shared by the four Wedding Planner pages: underline tabs, the
 * same pattern as the vendor shelf and the booking list. The gold underline
 * slides to the active page, so moving inside the planner is felt, not just
 * seen. Scrolls inside its own row on narrow screens, never the page. */
export function WeddingPlannerTabs() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <nav aria-label="Wedding Planner" className="wd-rail mb-8 overflow-x-auto border-b border-wd-line">
      <ul className="flex min-w-max gap-7">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="relative">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center pb-3 pt-2 text-[0.95rem] transition-colors ${active ? "font-semibold text-wd-ink" : "text-wd-muted hover:text-wd-ink"}`}
              >
                {tab.label}
                {active && <motion.span layoutId={reduced ? undefined : "planner-tab"} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-wd-accent" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
