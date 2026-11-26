"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

import { controlClasses } from "@/components/ui/Field";
import { EASE, useReducedMotion } from "@/lib/motion";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const HARI_PANJANG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromIso(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** "2027-01-09" -> "Sabtu, 9 Januari 2027". Local date, so the day never
 * shifts by timezone. Same words on every device (no browser locale). */
export function formatTanggal(iso: string): string {
  const d = fromIso(iso);
  return d ? `${HARI_PANJANG[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : "";
}

export function todayIso(): string {
  return toIso(new Date());
}

/**
 * Indonesian date field. The native date input renders in the browser's
 * locale ("mm/dd/yyyy" on many phones), so this shows the chosen date in
 * words and opens an inline month calendar (Senin first). Keyboard: arrows
 * move a day/week, PageUp/PageDown a month, Home/End the week, Enter picks,
 * Escape closes. Value stays "YYYY-MM-DD" for the API.
 */
export function TanggalPicker({
  label,
  value,
  onChange,
  min,
  hint,
  error,
  unavailable,
  marked,
  markedLabel = "Tanggal nikahmu",
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  hint?: string;
  error?: string | null;
  /** Days the vendor cannot take ("booked" = locked by a booking, "blocked" = closed by the vendor). Shown struck out and not selectable. */
  unavailable?: Record<string, "booked" | "blocked">;
  /** A day to point out (the couple's wedding date), ringed in gold. */
  marked?: string;
  markedLabel?: string;
}) {
  const id = useId();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const minDate = min ? fromIso(min) : null;
  const start = fromIso(value) ?? minDate ?? new Date();
  const [focus, setFocus] = useState<Date>(start);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  // Keyboard moves focus to the new day once it is rendered.
  useEffect(() => {
    if (!open || !moved.current) return;
    moved.current = false;
    const day = grid.current?.querySelector<HTMLButtonElement>('[tabindex="0"]');
    day?.focus({ preventScroll: true });
    grid.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [focus, open, reduced]);

  // Opening moves focus into the calendar (date-picker pattern), so the
  // arrow keys work straight away and the month is scrolled into view.
  function toggle() {
    if (!open) {
      setFocus(fromIso(value) ?? minDate ?? new Date());
      moved.current = true;
    }
    setOpen((v) => !v);
  }

  const isBefore = (d: Date) => !!minDate && d < minDate;

  function move(d: Date) {
    moved.current = true;
    setFocus(minDate && d < minDate ? minDate : d);
  }

  function pick(d: Date) {
    if (isBefore(d) || unavailable?.[toIso(d)]) return;
    onChange(toIso(d));
    setOpen(false);
    trigger.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    const f = focus;
    const y = f.getFullYear(), m = f.getMonth(), day = f.getDate();
    const dow = (f.getDay() + 6) % 7;
    const map: Record<string, Date> = {
      ArrowLeft: new Date(y, m, day - 1),
      ArrowRight: new Date(y, m, day + 1),
      ArrowUp: new Date(y, m, day - 7),
      ArrowDown: new Date(y, m, day + 7),
      PageUp: new Date(y, m - 1, Math.min(day, 28)),
      PageDown: new Date(y, m + 1, Math.min(day, 28)),
      Home: new Date(y, m, day - dow),
      End: new Date(y, m, day + (6 - dow)),
    };
    if (e.key in map) {
      e.preventDefault();
      move(map[e.key]);
    } else if (e.key === "Escape") {
      // Close only the calendar, not the sheet around it.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }
  }

  const y = focus.getFullYear();
  const m = focus.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => new Date(y, m, i + 1))];
  const todayStr = todayIso();
  const prevDisabled = !!minDate && new Date(y, m, 0) < minDate;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;

  const nav =
    "flex h-11 w-11 items-center justify-center rounded-full text-dc-ink transition-colors hover:bg-dc-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-semibold text-dc-ink">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`${id}-cal`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={error ? errId : hint ? hintId : undefined}
        className={`${controlClasses} flex items-center justify-between gap-3 text-left`}
      >
        <span id={`${id}-value`} className={value ? "text-dc-black" : "text-dc-text-3"}>
          {value ? formatTanggal(value) : "Pilih tanggal"}
        </span>
        <svg aria-hidden width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="shrink-0 text-dc-clay">
          <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
          <path d="M3 8.5h14M7 2.8v3.4M13 2.8v3.4" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          // Opens in place (height reveal) so it works the same inside the card and the sheet.
          <motion.div
            id={`${id}-cal`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transition: { duration: reduced ? 0.01 : 0.3, ease: EASE } }}
            exit={{ opacity: 0, height: 0, transition: { duration: reduced ? 0.01 : 0.18 } }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-lg border border-dc-line bg-dc-white p-2 shadow-soft sm:p-3" onKeyDown={onKey}>
              <div className="flex items-center justify-between">
                <button type="button" className={nav} disabled={prevDisabled} onClick={() => setFocus(new Date(y, m - 1, 1))} aria-label="Bulan sebelumnya">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m15 5-7 7 7 7" />
                  </svg>
                </button>
                <p className="font-heading text-xl text-dc-ink" aria-live="polite">
                  {BULAN[m]} {y}
                </p>
                <button type="button" className={nav} onClick={() => setFocus(new Date(y, m + 1, 1))} aria-label="Bulan berikutnya">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div role="grid" aria-label={`${BULAN[m]} ${y}`} ref={grid} className="mt-1">
                <div role="row" className="grid grid-cols-7">
                  {HARI.map((h) => (
                    <span key={h} role="columnheader" className="py-1.5 text-center text-xs font-semibold text-dc-text-3">
                      {h}
                    </span>
                  ))}
                </div>
                {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => (
                  <div role="row" key={r} className="grid grid-cols-7">
                    {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                      if (!d) return <span key={`e${i}`} role="gridcell" />;
                      const iso = toIso(d);
                      const selected = iso === value;
                      const off = unavailable?.[iso];
                      const disabled = isBefore(d) || !!off;
                      const isMarked = iso === marked;
                      const focused = iso === toIso(focus);
                      return (
                        <span key={iso} role="gridcell" aria-selected={selected} className="flex justify-center">
                          <button
                            type="button"
                            tabIndex={focused ? 0 : -1}
                            disabled={disabled}
                            onClick={() => pick(d)}
                            aria-label={`${formatTanggal(iso)}${iso === todayStr ? ", hari ini" : ""}${isMarked ? `, ${markedLabel.toLowerCase()}` : ""}${off ? ", vendor tidak tersedia" : ""}`}
                            className={`relative flex h-11 w-11 items-center justify-center rounded-full text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dc-gold disabled:cursor-not-allowed disabled:font-normal disabled:text-dc-text-3 ${
                              selected ? "bg-dc-ink font-semibold text-dc-on-dark" : off ? "font-normal text-dc-text-3 line-through decoration-1" : "font-medium text-dc-black hover:bg-dc-cream"
                            } ${isMarked && !selected ? "ring-2 ring-inset ring-dc-gold" : ""}`}
                          >
                            {d.getDate()}
                            {iso === todayStr && !selected && <span aria-hidden className="absolute bottom-1.5 h-1 w-1 rounded-full bg-dc-gold" />}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              {(unavailable || marked) && (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-dc-line px-1 pt-2 text-[0.72rem] text-dc-text-2">
                  {unavailable && (
                    <li className="flex items-center gap-1.5">
                      <span aria-hidden className="text-dc-text-3 line-through">
                        12
                      </span>
                      Vendor tidak tersedia
                    </li>
                  )}
                  {marked && (
                    <li className="flex items-center gap-1.5">
                      <span aria-hidden className="h-3.5 w-3.5 rounded-full ring-2 ring-inset ring-dc-gold" />
                      {markedLabel}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-dc-text-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs font-medium text-dc-danger">
          {error}
        </p>
      )}
    </div>
  );
}
