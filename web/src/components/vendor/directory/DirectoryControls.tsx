"use client";

import { useId, useMemo, useState } from "react";

import { wdButton } from "@/components/home/ui";
import { Picker } from "@/components/ui/Picker";
import { Sheet } from "@/components/ui/Sheet";
import { VENDOR_CATEGORIES } from "@/lib/api";
import { cityOptions } from "@/lib/wilayah";

import { BUDGETS, SORTS, type Filters, type Sort } from "./filters";
import { ChoiceChips, CityQuickChips } from "./ListingMotion";
import { FilterButton, RadioList, TEXT_LINK } from "./ListingParts";

type Props = {
  category: string;
  onCategory: (value: string) => void;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  cities: string[];
  /** Vendors per city in the loaded list, for the quick city chips. */
  cityCounts: Map<string, number>;
  resultCount: number;
  ready: boolean;
};

export const BUDGET_HINT = "Vendor yang harganya ditanyakan lewat chat tidak ikut tampil saat budget dipilih.";
const CATEGORY_CHOICES = [{ value: "", label: "Semua kategori" }, ...VENDOR_CATEGORIES];
const BUDGET_CHOICES = BUDGETS.map((b) => ({ value: b.value, label: b.short }));

/** Kota picker styled as a field (searchable, every kabupaten/kota). */
export function CityField({ value, onChange, cities }: { value: string; onChange: (v: string) => void; cities: string[] }) {
  const opts = useMemo(() => cityOptions(cities), [cities]);
  return (
    <Picker
      label="Kota"
      value={value}
      onChange={onChange}
      options={opts}
      placeholder="Semua kota"
      searchPlaceholder="Cari kota atau provinsi"
      sheetDescription="Semua kabupaten dan kota di Indonesia."
      panelMinWidth={300}
      className="flex min-h-12 w-full items-center rounded-[14px] border border-wd-line-2 bg-white px-4 text-left transition-colors hover:border-wd-ink aria-expanded:border-wd-ink"
      valueClassName="text-[0.92rem] font-semibold text-wd-ink"
    />
  );
}

export function SearchField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Cari nama vendor atau kota
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
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-wd-muted"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari vendor atau kota"
        autoComplete="off"
        className="h-12 w-full rounded-full border border-wd-line-2 bg-white pl-11 pr-4 text-base text-wd-ink outline-none transition-colors placeholder:text-wd-muted hover:border-wd-ink focus:border-wd-ink sm:text-[0.92rem] [&::-webkit-search-cancel-button]:appearance-none"
      />
    </div>
  );
}

/** Desktop (lg+) left sidebar: search, category, kota, budget, sort. Every
 * change applies at once; the page mirrors it into the URL. */
export function FilterSidebar({ category, onCategory, filters, onChange, onReset, cities, cityCounts }: Props) {
  const id = useId();
  const active = activeCount(category, filters);
  return (
    <div className="flex flex-col">
      <div className="flex min-h-11 items-center justify-between gap-3 pb-1">
        <h2 className="text-[1.05rem] font-semibold text-wd-ink">Saring vendor</h2>
        {active > 0 && (
          <button type="button" onClick={onReset} className={`-mr-2 min-h-11 rounded-md px-2 text-[0.88rem] ${TEXT_LINK}`}>
            Hapus semua<span className="sr-only"> filter</span>
          </button>
        )}
      </div>
      <div className="pb-5">
        <SearchField id={`${id}-q`} value={filters.query} onChange={(v) => onChange({ query: v })} />
      </div>
      <RadioList name={`${id}-kat`} legend="Kategori" value={category} options={CATEGORY_CHOICES} onPick={onCategory} />
      <div className="border-t border-wd-line py-5">
        <p id={`${id}-kota`} className="mb-2 text-[0.95rem] font-semibold text-wd-ink">
          Kota
        </p>
        <CityField value={filters.city} onChange={(v) => onChange({ city: v })} cities={cities} />
        <CityQuickChips counts={cityCounts} value={filters.city} onPick={(v) => onChange({ city: v })} />
      </div>
      <RadioList name={`${id}-budget`} legend="Budget mulai dari" value={filters.budget} options={BUDGET_CHOICES} onPick={(v) => onChange({ budget: v })} hint={BUDGET_HINT} />
      <RadioList name={`${id}-urut`} legend="Urutkan" value={filters.sort} options={SORTS} onPick={(v) => onChange({ sort: v as Sort })} />
    </div>
  );
}

function activeCount(category: string, filters: Filters) {
  return [category, filters.query.trim(), filters.city, filters.budget, filters.sort !== "default" ? "s" : ""].filter(Boolean).length;
}

/** Below lg: search field and a "Filter" button that opens the bottom sheet
 * with big tap targets; changes apply live, the footer shows the count. */
export function MobileFilters({ category, onCategory, filters, onChange, onReset, cities, cityCounts, resultCount, ready }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const activeCount = [category, filters.city, filters.budget, filters.sort !== "default" ? "s" : ""].filter(Boolean).length;
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchField id={`${id}-q`} value={filters.query} onChange={(v) => onChange({ query: v })} />
        </div>
        <FilterButton count={activeCount} onClick={() => setOpen(true)} />
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Saring vendor"
        description="Hasil berubah langsung setiap kali kamu memilih."
        footer={
          <div className="flex items-center gap-3">
            <button type="button" onClick={onReset} disabled={activeCount === 0} className={wdButton({ variant: "outline" })}>
              Hapus semua
            </button>
            <button type="button" onClick={() => setOpen(false)} className={wdButton({ variant: "gold", className: "flex-1" })}>
              {ready ? `Lihat ${resultCount} vendor` : "Lihat vendor"}
            </button>
          </div>
        }
      >
        <div className="wd flex flex-col gap-7">
          <ChoiceChips legend="Kategori" value={category} onPick={onCategory} options={[{ value: "", label: "Semua" }, ...VENDOR_CATEGORIES]} />
          <div className="flex flex-col gap-2.5">
            <p className="text-base font-semibold text-wd-ink">Kota</p>
            <CityField value={filters.city} onChange={(v) => onChange({ city: v })} cities={cities} />
            <CityQuickChips counts={cityCounts} value={filters.city} onPick={(v) => onChange({ city: v })} />
          </div>
          <ChoiceChips legend="Budget mulai dari" value={filters.budget} onPick={(v) => onChange({ budget: v })} options={BUDGETS.map((b) => ({ value: b.value, label: b.value ? b.label : "Semua budget" }))} hint={BUDGET_HINT} />
          <ChoiceChips legend="Urutkan" value={filters.sort} onPick={(v) => onChange({ sort: v as Sort })} options={SORTS} />
        </div>
      </Sheet>
    </>
  );
}
