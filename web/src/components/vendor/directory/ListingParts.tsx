// Shared pieces of the Bridestory-style vendor listing ("Putih" system):
// compact header with breadcrumb, a row of round category photos, the filter
// sidebar building blocks, removable filter chips, the card grid and its
// loading / empty states. Used by /vendors (client) and the server-rendered
// /kategori pages. No hooks here, so server components can render the
// link-only parts.
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { VENDOR_CATEGORIES } from "@/lib/api";

import { categoryThumb } from "./categoryArt";

/** 1 column on small phones, 2 from 480px, 3 next to the sidebar, 4 on wide screens. */
export const GRID = "grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export const TEXT_LINK = "font-semibold text-wd-accent-ink underline decoration-wd-accent-line underline-offset-4 hover:text-wd-ink";

export type Crumb = { name: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Jalur halaman" className="text-[0.85rem] text-wd-muted">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {items.map((c, i) => (
          <li key={c.name} className="flex items-center gap-x-1.5">
            {i > 0 && (
              <span aria-hidden className="text-wd-line-2">
                /
              </span>
            )}
            {c.href ? (
              <Link href={c.href} className="inline-flex min-h-11 items-center hover:text-wd-accent-ink hover:underline">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="inline-flex min-h-11 items-center text-wd-ink">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Breadcrumb, bold sans H1, one muted line. With `image`: a wide rounded
 * cover picture and the title on a white card overlapping its lower edge
 * (the same cover header as the content pages). */
export function ListingHeader({ id, crumbs, title, sub, image, focus = "50% 28%" }: { id: string; crumbs: Crumb[]; title: ReactNode; sub?: ReactNode; image?: string; focus?: string }) {
  if (image) {
    return (
      <div className="pt-2 sm:pt-3">
        <Breadcrumb items={crumbs} />
        <div className="relative mt-1 h-[120px] overflow-hidden rounded-[24px] bg-wd-blush sm:h-[230px] lg:h-[260px]">
          <Image src={image} alt="" fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" style={{ objectPosition: focus }} />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/15 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 -mt-9 mx-3 max-w-[720px] rounded-[22px] bg-white p-4 shadow-wd-pop sm:-mt-16 sm:ml-8 sm:p-7">
          <h1 id={id} className="wd-title text-[clamp(1.4rem,3vw,2.2rem)] leading-tight">
            {title}
          </h1>
          {sub && <p className="mt-1 text-[0.9rem] text-wd-muted sm:mt-1.5 sm:text-[0.95rem]">{sub}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="pt-2 sm:pt-3">
      <Breadcrumb items={crumbs} />
      <h1 id={id} className="wd-title text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">
        {title}
      </h1>
      {sub && <p className="mt-1.5 text-[0.95rem] text-wd-muted">{sub}</p>}
    </div>
  );
}

function catImage(value: string) {
  return categoryThumb(value);
}

/** Every category as a small round photo in one swipeable row. Pass
 * `onPick` for in-page filtering (toggle buttons) or `hrefFor` for links. */
export function CategoryStrip({
  active,
  onPick,
  hrefFor,
  withAll = false,
}: {
  active: string;
  onPick?: (value: string) => void;
  hrefFor?: (value: string) => string;
  withAll?: boolean;
}) {
  const items = [...(withAll ? [{ value: "", label: "Semua" }] : []), ...VENDOR_CATEGORIES];
  return (
    <ul aria-label="Pilih kategori" className="wd-rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-1 sm:gap-3 xl:justify-between">
      {items.map((c) => {
        const on = active === c.value;
        const src = c.value ? catImage(c.value) : null;
        const inner = (
          <>
            <span
              className={`relative block size-16 overflow-hidden rounded-full bg-wd-blush transition-[box-shadow] duration-300 sm:size-[72px] ${
                on ? "ring-[2.5px] ring-wd-accent ring-offset-2" : "ring-1 ring-wd-line group-hover:ring-2 group-hover:ring-wd-accent"
              }`}
            >
              {src ? (
                <Image src={src} alt="" fill sizes="72px" className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
              ) : (
                <AllIcon />
              )}
            </span>
            <span className={`mt-2 block text-[0.8rem] leading-tight ${on ? "font-semibold text-wd-ink" : "text-wd-text group-hover:text-wd-accent-ink"}`}>
              {c.label}
            </span>
          </>
        );
        const cls = "group flex w-[76px] flex-col items-center rounded-2xl pb-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink";
        return (
          <li key={c.value || "semua"} className="shrink-0">
            {onPick ? (
              <button type="button" aria-pressed={on} onClick={() => onPick(c.value)} className={cls}>
                {inner}
              </button>
            ) : (
              <Link href={hrefFor ? hrefFor(c.value) : "/vendors"} aria-current={on ? "page" : undefined} className={cls}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** "Semua" bubble: four category photos in a 2x2 grid. */
function AllIcon() {
  return (
    <span aria-hidden className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-white">
      {["venue", "mua_attire", "decor", "catering"].map((k) => (
        <span key={k} className="relative block overflow-hidden">
          {catImage(k) && <Image src={catImage(k)!} alt="" fill sizes="36px" className="object-cover" />}
        </span>
      ))}
    </span>
  );
}

/** One titled block of the filter sidebar. */
export function SideSection({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="border-t border-wd-line py-5 first:border-t-0 first:pt-0">
      <h2 id={id} className="mb-2 text-[0.95rem] font-semibold text-wd-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Single choice as native radios (label rows are 44px tall). */
export function RadioList({
  name,
  legend,
  value,
  options,
  onPick,
  hint,
}: {
  name: string;
  legend: string;
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  hint?: string;
}) {
  return (
    <fieldset className="border-t border-wd-line py-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-2 w-full text-[0.95rem] font-semibold text-wd-ink">{legend}</legend>
      <div className="clear-both flex flex-col">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={o.value || "semua"}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-[0.92rem] transition-colors hover:bg-wd-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-wd-accent-ink ${
                on ? "font-semibold text-wd-ink" : "text-wd-text"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onPick(o.value)}
                className="size-[18px] shrink-0 accent-wd-accent-ink focus-visible:outline-none"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-2 px-2 text-[0.8rem] leading-snug text-wd-muted">{hint}</p>}
    </fieldset>
  );
}

/** A link list in the sidebar (categories and cities on /kategori pages). */
export function SideLinks({ items, active }: { items: { href: string; label: string; count?: number; key: string; nofollow?: boolean }[]; active: string }) {
  return (
    <ul className="flex flex-col">
      {items.map((it) => {
        const on = it.key === active;
        return (
          <li key={it.key}>
            <Link
              href={it.href}
              rel={it.nofollow ? "nofollow" : undefined}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 text-[0.92rem] transition-colors ${
                on ? "bg-wd-accent-soft font-semibold text-wd-ink" : "text-wd-text hover:bg-wd-paper hover:text-wd-ink"
              }`}
            >
              <span className="min-w-0 truncate">{it.label}</span>
              {it.count !== undefined && <span className="shrink-0 tabular-nums text-[0.8rem] text-wd-muted">{it.count}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export type Chip = { key: string; label: string; clear: () => void };

export function ActiveChips({ chips, onClearAll }: { chips: Chip[]; onClearAll?: () => void }) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filter aktif" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.clear}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-wd-accent-line bg-wd-accent-wash pl-4 pr-3 text-[0.88rem] font-semibold text-wd-ink transition-colors hover:border-wd-ink"
          >
            {chip.label}
            <span className="sr-only">, hapus filter</span>
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-wd-accent-ink">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </li>
      ))}
      {onClearAll && chips.length > 1 && (
        <li>
          <button type="button" onClick={onClearAll} className={`min-h-11 px-2 text-[0.88rem] ${TEXT_LINK}`}>
            Hapus semua
          </button>
        </li>
      )}
    </ul>
  );
}

/** Card-shaped placeholders: photo, two-line name, meta, rating, price,
 * so nothing jumps when the real cards arrive. */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  const bar = "animate-pulse rounded-full bg-wd-blush motion-reduce:animate-none";
  return (
    <div role="status" aria-label="Memuat vendor" className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden>
          <div className="relative aspect-[4/5] animate-pulse rounded-[14px] bg-wd-blush motion-reduce:animate-none">
            <span className="absolute left-2.5 top-2.5 h-5 w-16 rounded-full bg-white/80" />
          </div>
          <div className={`mt-3 h-4 w-4/5 ${bar}`} />
          <div className={`mt-2 h-3 w-3/5 ${bar}`} />
          <div className={`mt-2.5 h-3 w-2/5 ${bar}`} />
          <div className={`mt-2.5 h-3 w-1/2 ${bar}`} />
        </div>
      ))}
    </div>
  );
}

/** Empty result panel: a title, one line, then the ways out. */
export function ListingEmpty({ title, body, actions }: { title: string; body: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-wd-line bg-wd-paper px-6 py-10 text-center sm:px-10">
      <h2 className="wd-title text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-relaxed text-wd-text">{body}</p>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

/** Funnel icon + label + active count: opens the filter sheet below lg. */
export function FilterButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border border-wd-line-2 bg-white px-5 text-[0.92rem] font-semibold text-wd-ink transition-colors hover:border-wd-ink"
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </svg>
      Filter
      {count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-wd-accent px-1.5 text-xs font-bold text-wd-ink">
          <span className="sr-only">, aktif </span>
          {count}
        </span>
      )}
    </button>
  );
}
