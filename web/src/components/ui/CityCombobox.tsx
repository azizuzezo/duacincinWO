"use client";
// Kabupaten/kota field: type to search the national list, pick one. The value
// is always an entry of the list (never free text), so the directory groups
// vendors under one spelling. WAI-ARIA combobox with a listbox popup: focus
// stays in the input, arrows move the highlight (aria-activedescendant),
// Enter picks, Escape closes and restores the picked value.

import { useId, useMemo, useRef, useState } from "react";

import { findRegion, searchRegions } from "@/lib/wilayah";

import { controlClasses } from "./Field";

export function CityCombobox({
  id: idProp,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder = "Ketik nama kabupaten atau kota",
}: {
  id?: string;
  label: string;
  /** The picked city ("" when none). A legacy free-text value shows as not picked yet. */
  value: string;
  onChange: (city: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const auto = useId();
  const id = idProp ?? `cc${auto.replace(/:/g, "")}`;
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const picked = findRegion(value);

  const [query, setQuery] = useState<string | null>(null); // null = not typing, show the picked value
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchRegions(query ?? ""), [query]);
  const text = query ?? picked?.city ?? "";

  function choose(city: string) {
    onChange(city);
    setQuery(null);
    setOpen(false);
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
      if (r) choose(r.city);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setQuery(null);
      setOpen(false);
    }
  }

  const legacy = value && !picked ? value : null;
  const describedBy = error ? errorId : hint || legacy ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-dc-ink">
        {label}
      </label>
      <div className="relative">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dc-text-3">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
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
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // A typed name that matches an entry exactly counts as picked.
            const exact = query !== null ? findRegion(query) : undefined;
            if (exact) onChange(exact.city);
            setQuery(null);
            setOpen(false);
            onBlur?.();
          }}
          className={`${controlClasses} pl-11`}
        />
        {picked && query === null && (
          <span className="pointer-events-none absolute right-4 top-1/2 max-w-[45%] -translate-y-1/2 truncate text-sm text-dc-text-3">{picked.province}</span>
        )}
        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            // Keep focus in the input while clicking a row.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-full z-40 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-dc-line bg-dc-white py-1.5 shadow-float"
          >
            {results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-dc-text-3">Tidak ada kabupaten atau kota dengan nama itu.</li>
            ) : (
              results.map((r, i) => (
                <li
                  key={r.city}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={r.city === picked?.city}
                  onClick={() => choose(r.city)}
                  onMouseMove={() => active !== i && setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 ${i === active ? "bg-dc-cream" : ""}`}
                >
                  <span className="font-semibold text-dc-ink">{r.city}</span>
                  <span className="truncate text-right text-sm text-dc-text-3">{r.province}</span>
                </li>
              ))
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
