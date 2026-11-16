"use client";
// Kabupaten/kota field: type to search the national list and pick one or
// more. Every value is an entry of the list (never free text), so the
// directory groups vendors under one spelling. WAI-ARIA combobox with a
// multi-select listbox: focus stays in the input, arrows move the highlight
// (aria-activedescendant), Enter toggles, Backspace in an empty field removes
// the last pick, Escape closes. Picks show as chips with their own remove
// buttons.

import { useId, useMemo, useRef, useState } from "react";

import { findRegion, searchRegions } from "@/lib/wilayah";

import { controlClasses } from "./Field";

export function CityCombobox({
  id: idProp,
  label,
  values,
  onChange,
  onBlur,
  error,
  hint,
  legacy,
  max = 10,
  placeholder = "Ketik nama kabupaten atau kota",
}: {
  id?: string;
  label: string;
  /** Picked cities, in the order they were chosen. */
  values: string[];
  onChange: (cities: string[]) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  /** An older free-text location that still needs picking again. */
  legacy?: string | null;
  max?: number;
  placeholder?: string;
}) {
  const auto = useId();
  const id = idProp ?? `cc${auto.replace(/:/g, "")}`;
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchRegions(query), [query]);
  const full = values.length >= max;

  function toggle(city: string) {
    if (values.includes(city)) onChange(values.filter((c) => c !== city));
    else if (!full) onChange([...values, city]);
    setQuery("");
    setActive(0);
  }

  function move(next: number) {
    const i = Math.max(0, Math.min(results.length - 1, next));
    setActive(i);
    listRef.current?.querySelector(`#${CSS.escape(`${id}-opt-${i}`)}`)?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else move(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(active - 1);
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const r = results[active];
      if (r) toggle(r.city);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  const describedBy = error ? errorId : hint || legacy ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-dc-ink">
        {label}
      </label>

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} terpilih`}>
          {values.map((c) => (
            <li key={c}>
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dc-line-strong bg-dc-cream py-1 pl-3.5 pr-1 text-sm font-semibold text-dc-ink">
                {c}
                <span className="font-normal text-dc-text-3">· {findRegion(c)?.province}</span>
                <button
                  type="button"
                  onClick={() => {
                    onChange(values.filter((x) => x !== c));
                    inputRef.current?.focus();
                  }}
                  aria-label={`Hapus ${c}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-dc-text-3 transition-colors hover:bg-dc-white hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dc-gold"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dc-text-3">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={full ? `Maksimal ${max} kabupaten/kota` : values.length ? "Tambah kabupaten atau kota lain" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setQuery("");
            setOpen(false);
            onBlur?.();
          }}
          className={`${controlClasses} pl-11`}
        />
        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            // Keep focus in the input while clicking a row.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-full z-40 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-dc-line bg-dc-white py-1.5 shadow-float"
          >
            {results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-dc-text-3">Tidak ada kabupaten atau kota dengan nama itu.</li>
            ) : (
              results.map((r, i) => {
                const on = values.includes(r.city);
                const blocked = full && !on;
                return (
                  <li
                    key={r.city}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={on}
                    aria-disabled={blocked || undefined}
                    onClick={() => !blocked && toggle(r.city)}
                    onMouseMove={() => active !== i && setActive(i)}
                    className={`flex min-h-11 items-center gap-3 px-4 py-2 ${blocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${i === active ? "bg-dc-cream" : ""}`}
                  >
                    <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong"}`}>
                      {on && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                        </svg>
                      )}
                    </span>
                    <span className="font-semibold text-dc-ink">{r.city}</span>
                    <span className="ml-auto truncate text-right text-sm text-dc-text-3">{r.province}</span>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-dc-danger">
          {error}
        </p>
      ) : legacy ? (
        <p id={hintId} className="text-xs leading-relaxed text-dc-text-3">
          Tertulis sebelumnya: &ldquo;{legacy}&rdquo;. Pilih ulang dari daftar supaya calon pengantin bisa menemukanmu.
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-dc-text-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
