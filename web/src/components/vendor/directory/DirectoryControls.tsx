"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { VENDOR_CATEGORIES } from "@/lib/api";

import { BUDGETS, SORTS, type Filters, type Sort } from "./filters";

type Props = {
  category: string;
  onCategory: (value: string) => void;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  cities: string[];
  resultCount: number;
  ready: boolean;
};

const SEGMENT =
  "flex min-h-14 flex-col justify-center gap-0.5 px-4 transition-colors hover:bg-dc-cream/50 focus-within:bg-dc-cream/70 focus-within:ring-2 focus-within:ring-inset focus-within:ring-dc-gold";
const SEG_LABEL = "text-xs font-semibold text-dc-text-3";
// The select covers the whole 56px segment so the full cell is the target;
// the small label sits above it and lets clicks pass through.
const SEG_SELECT =
  "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent pb-2 pl-4 pr-10 pt-6 text-sm font-semibold text-dc-ink outline-none focus-visible:outline-none";

/** Sticky search + filters under the directory hero.
 * Desktop (lg): one white bar of labelled segments, so every filter stays in
 * reach while scrolling a long list. Below lg: search field plus a "Filter"
 * button that opens a bottom sheet with big tap targets; changes apply live
 * and the sheet footer shows how many vendors match. */
export function DirectoryControls({ category, onCategory, filters, onChange, onReset, cities, resultCount, ready }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchId = useId();
  const activeCount = [category, filters.city, filters.budget, filters.sort !== "default" ? "s" : ""].filter(Boolean).length;

  // Desktop: visible "Cari vendor" label above the field, like every other
  // segment in the bar. Phone: the icon + placeholder carry it and the label is
  // for screen readers, so the field keeps its full width next to "Filter".
  const search = (suffix: "d" | "m") => {
    const desktop = suffix === "d";
    return (
      <div
        className={`relative min-w-0 flex-1 rounded-[inherit] focus-within:ring-2 focus-within:ring-inset focus-within:ring-dc-gold ${
          desktop ? "flex min-h-14 flex-col justify-center gap-0.5 pl-11 pr-4" : ""
        }`}
      >
        <label htmlFor={searchId + suffix} className={desktop ? SEG_LABEL : "sr-only"}>
          {desktop ? "Cari vendor" : "Cari nama vendor atau kota"}
        </label>
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dc-clay"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          id={searchId + suffix}
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder={desktop ? "Nama vendor atau kota" : "Cari vendor atau kota"}
          autoComplete="off"
          className={`w-full bg-transparent text-dc-ink outline-none placeholder:text-dc-text-3 [&::-webkit-search-cancel-button]:appearance-none ${
            desktop ? "text-sm font-semibold placeholder:font-normal" : "h-14 rounded-full pl-11 pr-4 text-base"
          }`}
        />
      </div>
    );
  };

  return (
    <>
      {/* Desktop bar */}
      <div className="hidden overflow-hidden rounded-2xl border border-dc-line-strong bg-dc-white shadow-soft focus-within:border-dc-ink/40 lg:flex">
        {search("d")}
        <Segment label="Kategori">
          <select aria-label="Kategori" value={category} onChange={(e) => onCategory(e.target.value)} className={SEG_SELECT}>
            <option value="">Semua kategori</option>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Segment>
        <Segment label="Kota">
          <select aria-label="Kota" value={filters.city} onChange={(e) => onChange({ city: e.target.value })} className={SEG_SELECT}>
            <option value="">Semua kota</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Segment>
        <Segment label="Budget mulai dari" wide>
          <select aria-label="Budget mulai dari" value={filters.budget} onChange={(e) => onChange({ budget: e.target.value })} className={SEG_SELECT}>
            {BUDGETS.map((b) => (
              <option key={b.value || "all"} value={b.value}>
                {b.short}
              </option>
            ))}
          </select>
        </Segment>
        <Segment label="Urutkan">
          <select aria-label="Urutkan" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as Sort })} className={SEG_SELECT}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Segment>
      </div>

      {/* Phone and tablet: search + sheet trigger */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex min-w-0 flex-1 rounded-full border border-dc-line-strong bg-dc-white shadow-soft focus-within:border-dc-ink/40">
          {search("m")}
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className="relative inline-flex h-14 shrink-0 items-center gap-2 rounded-full border border-dc-line-strong bg-dc-white px-4 text-sm font-semibold text-dc-ink shadow-soft transition-colors hover:border-dc-ink"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          <span className="max-[359px]:sr-only">Filter</span>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-dc-ink px-1.5 text-xs font-bold text-dc-on-dark">
              <span className="sr-only">, aktif </span>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Saring vendor"
        description="Hasil berubah langsung setiap kali kamu memilih."
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onReset} disabled={activeCount === 0}>
              Hapus semua
            </Button>
            <Button block onClick={() => setSheetOpen(false)}>
              {ready ? `Lihat ${resultCount} vendor` : "Lihat vendor"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-7">
          <ChoiceGroup
            legend="Kategori"
            value={category}
            onPick={onCategory}
            options={[{ value: "", label: "Semua" }, ...VENDOR_CATEGORIES]}
          />
          <ChoiceGroup
            legend="Kota"
            value={filters.city}
            onPick={(v) => onChange({ city: v })}
            options={[{ value: "", label: "Semua kota" }, ...cities.map((c) => ({ value: c, label: c }))]}
            hint={cities.length === 0 ? "Pilihan kota muncul setelah daftar vendor termuat." : undefined}
          />
          <ChoiceGroup
            legend="Budget mulai dari"
            value={filters.budget}
            onPick={(v) => onChange({ budget: v })}
            options={BUDGETS.map((b) => ({ value: b.value, label: b.value ? b.label : "Semua budget" }))}
            hint="Vendor yang harganya ditanyakan lewat chat tidak ikut tampil saat budget dipilih."
          />
          <ChoiceGroup legend="Urutkan" value={filters.sort} onPick={(v) => onChange({ sort: v as Sort })} options={SORTS} />
        </div>
      </Sheet>
    </>
  );
}

function Segment({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`${SEGMENT} relative ${wide ? "w-[13rem]" : "w-[11.5rem]"} shrink-0 border-l border-dc-line`}>
      <span aria-hidden className={`${SEG_LABEL} pointer-events-none relative -mt-5`}>
        {label}
      </span>
      {children}
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute bottom-[1.05rem] right-4 text-dc-text-3"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/** Single-choice chips for the sheet (44px targets, aria-pressed). */
function ChoiceGroup({
  legend,
  value,
  onPick,
  options,
  hint,
}: {
  legend: string;
  value: string;
  onPick: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="font-heading text-2xl leading-tight text-dc-ink">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-dc-text-3">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value || "all"}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(o.value)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-ink hover:border-dc-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
