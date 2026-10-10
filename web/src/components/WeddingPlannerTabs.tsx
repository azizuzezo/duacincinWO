"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/client/wedding-planner", label: "Checklist" },
  { href: "/client/wedding-planner/guests", label: "Tamu & RSVP" },
  { href: "/client/wedding-planner/rundown", label: "Rundown Acara" },
  { href: "/client/wedding-planner/seating", label: "Denah Meja" },
];

/** Sub-navigation shared by the four Wedding Planner pages (checklist,
 * guests/RSVP, rundown, seating): one feature area, kept under a single
 * CLIENT_NAV entry instead of cluttering the main sidebar with four items.
 * Underline tabs; scrolls inside its own container on narrow screens. */
export function WeddingPlannerTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Wedding Planner" className="mb-8 overflow-x-auto border-b border-dc-ink/10">
      <ul className="flex min-w-max gap-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center border-b-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                  active ? "border-dc-clay text-dc-ink" : "border-transparent text-dc-black/70 hover:text-dc-ink"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
