"use client";

import { useId } from "react";

import { categoryLabel, VENDOR_CATEGORIES } from "@/lib/api";

/** Several business categories for one vendor. Order is meaningful: the first
 * is the main category (shown on the directory card and used for the budget
 * planner), so tapping a chip adds it at the end and "Jadikan utama" moves one
 * to the front. */
export function CategoryChips({
  values,
  onChange,
  error,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const id = useId();
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const makeMain = (v: string) => onChange([v, ...values.filter((x) => x !== v)]);

  return (
    <fieldset aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}>
      <legend className="text-sm font-semibold text-dc-ink">Kategori usaha</legend>
      <p id={`${id}-hint`} className="mt-1 text-sm text-dc-text-2">
        Pilih semua layanan yang kamu tawarkan. Kategori pertama jadi kategori utama di kartu direktori.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {VENDOR_CATEGORIES.map((c) => {
          const on = values.includes(c.value);
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-text-2 hover:border-dc-ink hover:text-dc-ink"
              }`}
            >
              {on && (
                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              )}
              {c.label}
            </button>
          );
        })}
      </div>

      {values.length > 1 && (
        <ol className="mt-4 divide-y divide-dc-line rounded-xl border border-dc-line bg-dc-white">
          {values.map((v, i) => (
            <li key={v} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-sm">
              <span className="text-dc-ink">
                {categoryLabel(v)}
                {i === 0 && <span className="ml-2 rounded-full bg-dc-cream px-2 py-0.5 text-xs font-semibold text-dc-clay">Utama</span>}
              </span>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => makeMain(v)}
                  className="min-h-11 rounded-full px-3 text-sm font-semibold text-dc-clay hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                >
                  Jadikan utama
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p id={`${id}-err`} className="mt-2 text-sm font-medium text-dc-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
