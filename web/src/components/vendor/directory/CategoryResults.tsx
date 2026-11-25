"use client";

// Listing body of /kategori/[kategori] and /kategori/[kategori]/[kota]:
// left sidebar (other categories and cities as crawlable links, then budget
// and sort) and the card grid. The cards arrive from the server, so the first
// HTML already lists every vendor; budget and sort narrow it in the browser.
import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";

import { wdButton } from "@/components/home/ui";
import { Sheet } from "@/components/ui/Sheet";
import type { DirectoryCard } from "@/lib/api";

import { BUDGET_HINT } from "./DirectoryControls";
import { applyFilters, BUDGETS, budgetLabel, EMPTY_FILTERS, SORTS, type Sort } from "./filters";
import { BackToTop, ChoiceChips, CountNumber, ListingGrid } from "./ListingMotion";
import { ActiveChips, type Chip, FilterButton, ListingEmpty, RadioList, TEXT_LINK } from "./ListingParts";

const BUDGET_CHOICES = BUDGETS.map((b) => ({ value: b.value, label: b.short }));

export function CategoryResults({
  cards,
  links,
  phoneLinks,
  directoryHref,
  what,
}: {
  cards: DirectoryCard[];
  /** Server-rendered link sections (categories, cities) for the sidebar. */
  links: ReactNode;
  /** Same links, compact, above the grid below lg. */
  phoneLinks?: ReactNode;
  directoryHref: string;
  /** "Venue di Bandung": what the count line counts. */
  what: string;
}) {
  const id = useId();
  const [budget, setBudget] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const [open, setOpen] = useState(false);
  const visible = useMemo(() => applyFilters(cards, { ...EMPTY_FILTERS, budget, sort }), [cards, budget, sort]);
  const reset = () => {
    setBudget("");
    setSort("default");
  };

  const chips: Chip[] = [];
  if (budget) chips.push({ key: "budget", label: budgetLabel(budget), clear: () => setBudget("") });
  if (sort !== "default") chips.push({ key: "sort", label: SORTS.find((s) => s.value === sort)?.label ?? "", clear: () => setSort("default") });

  return (
    <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filter vendor" className="hidden lg:block">
        <div className="sticky top-[128px] max-h-[calc(100svh-144px)] overflow-y-auto overscroll-contain pb-6 pr-1 [scrollbar-width:thin]">
          {links}
          <RadioList name={`${id}-budget`} legend="Budget mulai dari" value={budget} options={BUDGET_CHOICES} onPick={setBudget} hint={BUDGET_HINT} />
          <RadioList name={`${id}-urut`} legend="Urutkan" value={sort} options={SORTS} onPick={(v) => setSort(v as Sort)} />
        </div>
      </aside>

      <section aria-labelledby="daftar-judul" className="min-w-0">
        <h2 id="daftar-judul" className="sr-only">
          Daftar vendor
        </h2>
        {phoneLinks && <div className="lg:hidden">{phoneLinks}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-[0.95rem] text-wd-text">
            Menampilkan <CountNumber value={visible.length} /> vendor {what}
          </p>
          <div className="lg:hidden">
            <FilterButton count={chips.length} onClick={() => setOpen(true)} />
          </div>
        </div>
        {chips.length > 0 && (
          <div className="mt-3">
            <ActiveChips chips={chips} onClearAll={reset} />
          </div>
        )}

        <div className="mt-6">
          {visible.length === 0 ? (
            <ListingEmpty
              title="Belum ada yang cocok"
              body="Tidak ada vendor di budget ini. Vendor yang harganya ditanyakan lewat chat tidak ikut tampil saat budget dipilih."
              actions={
                <button type="button" onClick={reset} className={wdButton({ size: "sm" })}>
                  Lihat semua budget
                </button>
              }
            />
          ) : (
            <ListingGrid cards={visible} />
          )}
        </div>
      </section>

      <BackToTop />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Saring vendor"
        description="Hasil berubah langsung setiap kali kamu memilih."
        footer={
          <div className="flex items-center gap-3">
            <button type="button" onClick={reset} disabled={chips.length === 0} className={wdButton({ variant: "outline" })}>
              Hapus semua
            </button>
            <button type="button" onClick={() => setOpen(false)} className={wdButton({ variant: "gold", className: "flex-1" })}>
              Lihat {visible.length} vendor
            </button>
          </div>
        }
      >
        <div className="wd flex flex-col gap-7">
          <ChoiceChips legend="Budget mulai dari" value={budget} onPick={setBudget} options={BUDGETS.map((b) => ({ value: b.value, label: b.value ? b.label : "Semua budget" }))} hint={BUDGET_HINT} />
          <ChoiceChips legend="Urutkan" value={sort} onPick={(v) => setSort(v as Sort)} options={SORTS} />
          <Link href={directoryHref} className={`inline-flex min-h-11 items-center text-[0.9rem] ${TEXT_LINK}`}>
            Cari dengan kata kunci di direktori lengkap
          </Link>
        </div>
      </Sheet>
    </div>
  );
}
