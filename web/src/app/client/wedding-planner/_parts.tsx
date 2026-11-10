"use client";

// Shared pieces for the four Wedding Planner pages (checklist, tamu, rundown,
// denah meja). Private to this route folder: built on components/ui, no new
// colors, so the planner reads as one workspace.

import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { WeddingPlannerTabs } from "@/components/WeddingPlannerTabs";
import type { CurrentUser } from "@/lib/api";

/** Page frame: app shell, planner tabs, and the content column. `bottomBar`
 * leaves room for the mobile sticky action bar. */
export function PlannerFrame({
  user,
  children,
  bottomBar = false,
}: {
  user: CurrentUser;
  children: React.ReactNode;
  bottomBar?: boolean;
}) {
  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className={`mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 ${bottomBar ? "pb-28 md:pb-10" : ""}`}>
        <WeddingPlannerTabs />
        {children}
      </div>
    </Shell>
  );
}

/** Serif page title with one italic gold phrase (DESIGN.md: one per title). */
export function PlannerTitle({
  title,
  accent,
  subtitle,
  action,
}: {
  title: string;
  accent: string;
  subtitle: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0 max-w-2xl animate-fade-up">
        <h1 className="font-heading text-[2.6rem] leading-[1.02] text-dc-ink sm:text-[3.4rem]">
          {title} <em className="dc-em">{accent}</em>
        </h1>
        <p className="mt-3 text-[1.02rem] leading-relaxed text-dc-text-2">{subtitle}</p>
      </div>
      {action && <div className="hidden shrink-0 md:flex md:gap-2">{action}</div>}
    </div>
  );
}

/** Mobile: the page's main action pinned above the bottom tab bar (56px). */
export function MobileActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-dc-line bg-dc-ivory/95 px-4 py-3 md:hidden">
      <div className="mx-auto flex max-w-md gap-2">{children}</div>
    </div>
  );
}

/** Action failure after the page loaded: stays visible until dismissed. */
export function InlineAlert({ message, onClose }: { message: string | null; onClose: () => void }) {
  return (
    <div aria-live="assertive">
      {message && (
        <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-dc-danger/25 bg-dc-danger/[0.05] py-2 pl-4 pr-1">
          <p className="py-2.5 text-sm font-medium text-dc-danger">{message}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pesan"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-dc-danger hover:bg-dc-danger/10"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Progress ring: gold arc on a champagne track, value in the display serif. */
export function ProgressRing({ value, size = 132, label }: { value: number; size?: number; label: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--dc-paper-3)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--dc-gold)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          className="transition-[stroke-dashoffset] duration-700 ease-dc"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-heading text-[2.1rem] font-semibold text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
        {pct}
        <span className="ml-0.5 mt-2 text-base text-dc-text-3">%</span>
      </span>
    </div>
  );
}

/** Initial-based avatar (DESIGN.md: no generated portraits). */
export function Initials({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dc-line-strong bg-dc-cream font-heading text-dc-clay ${className}`}>
      {initials || "?"}
    </span>
  );
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2027-01-09" or a full ISO string -> "9 Januari 2027". Calendar date only, no time zone shift. */
export function formatTanggal(value?: string | null): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Calendar part of a date for <input type="date">. */
export function dateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

/** Today as YYYY-MM-DD in the viewer's zone. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PATHS = {
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  pencil: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  check: "M5 12.5l4.5 4.5L19 7.5",
  calendar: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  copy: "M9 9h10v11H9zM5 15V4h10",
  pin: "M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  chevron: "M6 9l6 6 6-6",
  alert: "M12 8v5M12 16.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  store: "M4 9l1.5-5h13L20 9M4 9h16M4 9v1.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0V9M5 13v7h14v-7",
  users: "M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z",
  move: "M5 12h14M13 6l6 6-6 6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
} as const;

export type IconName = keyof typeof PATHS;

/** Hairline icon, same stroke weight as the app shell navigation. */
export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Filter chip row (client-side filters). Pill because a chip is a toggle. */
export function FilterChips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ${
              on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-ink hover:border-dc-ink"
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`text-xs tabular-nums ${on ? "text-dc-on-dark/80" : "text-dc-text-3"}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
