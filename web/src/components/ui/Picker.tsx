"use client";

// Branded single-choice picker: replaces the native <select> wherever a couple
// chooses something in a public page (hero search, directory filters, 404).
// WAI-ARIA "select-only combobox": the trigger keeps focus while the list is
// open and points at the highlighted option with aria-activedescendant, so
// screen readers hear every move without focus jumping around.
//
// Desktop/tablet (>= 640px): a popover portalled to <body>, so a parent with
// overflow:hidden or a transform (the hero, the sticky filter bar) can never
// clip it; it flips above the field when there is no room below.
// Phone (< 640px): the list opens in the shared bottom Sheet, with big rows.
//
// Works in a plain GET form: give it `name` and a hidden input carries the
// value, exactly like the select it replaces. Controlled (`value` +
// `onChange`) or uncontrolled (`defaultValue`).
//
// Motion purpose: the popover grows out of the field it belongs to (scale +
// fade from the field edge, 200ms) so the eye knows where the list came from;
// the gold check pops in on the chosen row to confirm the choice. Reduced
// motion: instant.

import { AnimatePresence, motion, type Variants } from "framer-motion";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

import { EASE, motionSafe, useReducedMotion } from "@/lib/motion";

import { Sheet } from "./Sheet";

export type PickerOption = {
  value: string;
  label: string;
  /** Second line under the label (e.g. what a category covers). */
  description?: string;
  /** Small round photo (public path). Takes precedence over `icon`. */
  image?: string;
  /** Small decorative mark shown in a cream circle when there is no photo. */
  icon?: ReactNode;
  disabled?: boolean;
};

type Props = {
  options: PickerOption[];
  /** Accessible name; also the sheet title on phones and the visible caption with `showLabel`. */
  label: string;
  /** Render `label` as a small caption above the value inside the trigger. */
  showLabel?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Form field name: renders a hidden input so GET/POST forms submit the value. */
  name?: string;
  id?: string;
  /** Shown when no option matches the value. */
  placeholder?: string;
  disabled?: boolean;
  /** Trigger classes (layout, size, surface, focus). */
  className?: string;
  captionClassName?: string;
  valueClassName?: string;
  /** Minimum popover width in px (it is never narrower than the trigger). */
  panelMinWidth?: number;
  /** One line under the sheet title on phones. */
  sheetDescription?: string;
};

const PHONE_QUERY = "(max-width: 639px)";
const GAP = 8;
const EDGE = 8;
const MAX_PANEL = 380;

function subscribePhone(cb: () => void) {
  const m = window.matchMedia(PHONE_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const noopSubscribe = () => () => {};

/** Same server and first client render (false), then the real value. */
function useIsPhone() {
  return useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
}
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

type Pos = { left: number; width: number; maxHeight: number; top?: number; bottom?: number; placement: "below" | "above" };

const popover: Variants = {
  hidden: (above: boolean) => ({ opacity: 0, scale: 0.96, y: above ? 6 : -6 }),
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.14, ease: EASE } },
};

// Keeps events from the portalled list out of ancestors' React handlers
// (React bubbles through portals), e.g. the hero's swipe and parallax.
const stop = (e: SyntheticEvent) => e.stopPropagation();

export function Picker({
  options,
  label,
  showLabel = false,
  value: valueProp,
  defaultValue = "",
  onChange,
  name,
  id: idProp,
  placeholder = "Pilih",
  disabled = false,
  className,
  captionClassName = "text-xs font-semibold text-dc-text-3",
  valueClassName = "text-[0.95rem] font-semibold text-dc-ink",
  panelMinWidth = 0,
  sheetDescription,
}: Props) {
  const auto = useId();
  const baseId = idProp ?? `pk${auto.replace(/:/g, "")}`;
  const listId = `${baseId}-list`;
  const optId = (i: number) => `${baseId}-opt-${i}`;

  const [inner, setInner] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : inner;
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<Pos | null>(null);

  const phone = useIsPhone();
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const sheetListRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", timer: 0 });

  const enabled = useCallback((i: number) => i >= 0 && i < options.length && !options[i].disabled, [options]);
  const firstEnabled = useCallback(() => options.findIndex((o) => !o.disabled), [options]);
  const lastEnabled = useCallback(() => {
    for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i;
    return -1;
  }, [options]);

  function step(from: number, dir: 1 | -1, count = 1) {
    let i = from;
    let target = from;
    for (let moved = 0; moved < count; ) {
      i += dir;
      if (i < 0 || i >= options.length) break;
      if (!options[i].disabled) {
        target = i;
        moved++;
      }
    }
    return target < 0 ? (dir === 1 ? firstEnabled() : lastEnabled()) : target;
  }

  function openAt(index: number) {
    if (disabled) return;
    setActive(enabled(index) ? index : enabled(selectedIndex) ? selectedIndex : firstEnabled());
    setOpen(true);
  }

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setPos(null);
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  function commit(index: number, refocus = true) {
    if (!enabled(index)) return;
    const next = options[index].value;
    if (next !== value) {
      if (!controlled) setInner(next);
      onChange?.(next);
    }
    close(refocus);
  }

  // Typeahead: letters typed within 600ms build one search string.
  function typeahead(char: string): number {
    const t = typed.current;
    window.clearTimeout(t.timer);
    t.text += char.toLowerCase();
    t.timer = window.setTimeout(() => (t.text = ""), 600);
    const start = open && active >= 0 ? active : selectedIndex;
    const ordered = [...options.keys()].map((k) => (k + Math.max(start, 0) + (t.text.length === 1 ? 1 : 0)) % options.length);
    const match = ordered.find((i) => !options[i].disabled && options[i].label.toLowerCase().startsWith(t.text));
    return match ?? -1;
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    const k = e.key;
    const printable = k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        openAt(selectedIndex);
      } else if (k === "Home") {
        e.preventDefault();
        openAt(firstEnabled());
      } else if (k === "End") {
        e.preventDefault();
        openAt(lastEnabled());
      } else if (printable) {
        openAt(typeahead(k));
      }
      return;
    }
    switch (k) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => step(a, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) commit(active);
        else setActive((a) => step(a, -1));
        break;
      case "PageDown":
        e.preventDefault();
        setActive((a) => step(a, 1, 10));
        break;
      case "PageUp":
        e.preventDefault();
        setActive((a) => step(a, -1, 10));
        break;
      case "Home":
        e.preventDefault();
        setActive(firstEnabled());
        break;
      case "End":
        e.preventDefault();
        setActive(lastEnabled());
        break;
      case "Enter":
        e.preventDefault();
        commit(active);
        break;
      case " ":
        e.preventDefault();
        if (typed.current.text) {
          const i = typeahead(k);
          if (i >= 0) setActive(i);
        } else commit(active);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case "Tab":
        // APG: Tab keeps the highlighted option and moves on. In the sheet,
        // Tab belongs to the dialog's focus trap.
        if (!phone) commit(active, false);
        break;
      default:
        if (printable) {
          const i = typeahead(k);
          if (i >= 0) setActive(i);
        }
    }
  }

  // Popover placement: below the field, flipped above when the room below is
  // short and there is more room above. Kept in the viewport horizontally.
  const place = useCallback(() => {
    const t = triggerRef.current;
    const p = panelRef.current;
    if (!t || !p) return;
    const r = t.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const natural = Math.min(p.scrollHeight, MAX_PANEL);
    const below = vh - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    const flip = below < Math.min(natural, 240) && above > below;
    const width = Math.min(Math.max(r.width, panelMinWidth), vw - EDGE * 2);
    const left = Math.min(Math.max(r.left, EDGE), vw - width - EDGE);
    setPos(
      flip
        ? { placement: "above", left, width, bottom: vh - r.top + GAP, maxHeight: Math.min(MAX_PANEL, above) }
        : { placement: "below", left, width, top: r.bottom + GAP, maxHeight: Math.min(MAX_PANEL, Math.max(below, 160)) },
    );
  }, [panelMinWidth]);

  const popoverOpen = open && !phone;

  useLayoutEffect(() => {
    if (!popoverOpen) return;
    place();
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [popoverOpen, place]);

  // Click or tap outside closes the popover (focus stays where the user went).
  useEffect(() => {
    if (!popoverOpen) return;
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [popoverOpen, close]);

  // Phone: the Sheet's focus trap focuses its first control; move focus to
  // the list right after so arrows and typeahead work at once.
  useEffect(() => {
    if (!open || !phone) return;
    const f = requestAnimationFrame(() => sheetListRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(f);
  }, [open, phone]);

  // Keep the highlighted row in view while moving with the keyboard.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
    // optId is derived from baseId, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, pos?.placement]);

  useEffect(() => () => window.clearTimeout(typed.current.timer), []);

  const rows = (big: boolean) =>
    options.map((o, i) => (
      <PickerRow
        key={o.value || "__all"}
        id={optId(i)}
        option={o}
        big={big}
        selected={i === selectedIndex}
        active={i === active}
        onHover={() => !o.disabled && setActive(i)}
        onPick={() => commit(i)}
      />
    ));

  const chosen = selected ?? null;

  return (
    <>
      <button
        ref={triggerRef}
        id={baseId}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={popoverOpen && active >= 0 ? optId(active) : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openAt(selectedIndex))}
        onKeyDown={onKeyDown}
        // Some browsers activate a button on Space keyup; the keydown already handled it.
        onKeyUp={(e) => e.key === " " && e.preventDefault()}
        className={
          className ??
          "flex min-h-12 w-full items-center rounded-md border border-dc-line-strong bg-dc-white px-4 text-left transition-[border-color,box-shadow] duration-200 hover:border-dc-text-3 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        <span className="flex w-full min-w-0 flex-col items-start justify-center gap-0.5 text-left">
          {showLabel && <span className={captionClassName}>{label}</span>}
          <span className="flex w-full min-w-0 items-center gap-2">
            {chosen && (chosen.image || chosen.icon) && <Thumb option={chosen} size="sm" />}
            <span className={`min-w-0 flex-1 truncate ${valueClassName} ${chosen ? "" : "text-dc-text-3"}`}>{chosen?.label ?? placeholder}</span>
            <svg
              aria-hidden
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 text-dc-text-3 transition-transform duration-200 ease-dc motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </span>
      </button>
      {name !== undefined && <input type="hidden" name={name} value={value} />}

      {mounted &&
        createPortal(
          <div onPointerMove={stop} onTouchStart={stop} onTouchEnd={stop} onFocus={stop} onBlur={stop}>
            <AnimatePresence>
              {popoverOpen && (
                <motion.ul
                  key="panel"
                  ref={panelRef}
                  id={listId}
                  role="listbox"
                  aria-label={label}
                  tabIndex={-1}
                  custom={pos?.placement === "above"}
                  variants={motionSafe(reduced, popover)}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  // Clicking a row must not move focus off the trigger.
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    position: "fixed",
                    left: pos?.left ?? 0,
                    width: pos?.width,
                    top: pos?.top,
                    bottom: pos?.bottom,
                    maxHeight: pos?.maxHeight ?? MAX_PANEL,
                    visibility: pos ? "visible" : "hidden",
                    transformOrigin: pos?.placement === "above" ? "50% 100%" : "50% 0%",
                  }}
                  className="z-[80] overflow-y-auto overscroll-contain rounded-[18px] border border-dc-line bg-dc-white p-1.5 shadow-float outline-none"
                >
                  {rows(false)}
                </motion.ul>
              )}
            </AnimatePresence>
            <Sheet open={open && phone} onClose={() => close()} title={label} description={sheetDescription}>
              <ul
                ref={sheetListRef}
                id={listId}
                role="listbox"
                aria-label={label}
                tabIndex={0}
                aria-activedescendant={active >= 0 ? optId(active) : undefined}
                onKeyDown={onKeyDown}
                className="-mx-2 flex flex-col gap-1 rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-dc-gold"
              >
                {rows(true)}
              </ul>
            </Sheet>
          </div>,
          document.body,
        )}
    </>
  );
}

function Thumb({ option, size }: { option: PickerOption; size: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "size-5" : size === "md" ? "size-8" : "size-10";
  const px = size === "sm" ? "20px" : size === "md" ? "32px" : "40px";
  if (option.image) {
    return (
      <span aria-hidden className={`relative ${box} shrink-0 overflow-hidden rounded-full bg-dc-cream ring-1 ring-dc-line`}>
        <Image src={option.image} alt="" fill sizes={px} className="object-cover" />
      </span>
    );
  }
  return (
    <span aria-hidden className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-dc-cream text-dc-clay ring-1 ring-dc-line`}>
      {option.icon}
    </span>
  );
}

function PickerRow({
  id,
  option,
  big,
  selected,
  active,
  onHover,
  onPick,
}: {
  id: string;
  option: PickerOption;
  big: boolean;
  selected: boolean;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const hasThumb = Boolean(option.image || option.icon);
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      onMouseMove={onHover}
      onClick={() => !option.disabled && onPick()}
      className={`flex select-none items-center gap-3 rounded-xl px-3 transition-colors duration-150 ${big ? "min-h-14 py-2" : "min-h-11 py-1.5"} ${
        option.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
      } ${active ? "bg-dc-ink/[0.06]" : ""} ${selected && !active ? "bg-dc-cream/70" : ""}`}
    >
      {hasThumb && <Thumb option={option} size={big ? "lg" : "md"} />}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-dc-ink ${big ? "text-base" : "text-sm"} ${selected ? "font-bold" : "font-semibold"}`}>{option.label}</span>
        {option.description && <span className="block truncate text-xs leading-snug text-dc-text-3">{option.description}</span>}
      </span>
      {/* Gold check: the deep end of the brand gold gradient keeps 3:1 on ivory. */}
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center rounded-full bg-linear-135 from-dc-gold to-dc-clay text-dc-white transition-[transform,opacity] duration-200 ease-dc motion-reduce:transition-none ${
          selected ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
    </li>
  );
}
