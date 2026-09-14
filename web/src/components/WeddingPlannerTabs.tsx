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
 * CLIENT_NAV entry instead of cluttering the main sidebar with four items. */
export function WeddingPlannerTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-dc-black/10 pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active ? "bg-dc-navy text-dc-white" : "text-dc-navy/70 hover:bg-dc-offwhite"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
