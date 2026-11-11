"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Form controls. Every control has a visible label (or `srLabel` when the
 * context already labels it visually, e.g. a search bar), an optional hint,
 * and an error that is announced and linked with aria-describedby.
 * Controls are 48px tall, 12px radius, warm card surface, gold focus ring.
 */
export const controlClasses =
  "w-full min-h-12 rounded-md border border-dc-line-strong bg-dc-white px-4 text-[0.95rem] text-dc-black transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-dc-text-3 hover:border-dc-text-3 focus:border-dc-gold focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--dc-gold)_18%,transparent)] focus:outline-none disabled:cursor-not-allowed disabled:bg-dc-cream disabled:text-dc-text-3 aria-invalid:border-dc-danger aria-invalid:focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--dc-danger)_15%,transparent)]";

type FieldShellProps = {
  label: ReactNode;
  /** Visually hide the label (it stays for screen readers). */
  srLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** Adds "(opsional)" after the label. Required is the default, so it is not marked. */
  optional?: boolean;
  className?: string;
};

function useFieldIds(id?: string) {
  const auto = useId();
  const base = id ?? auto;
  return { id: base, hintId: `${base}-hint`, errorId: `${base}-error` };
}

function Shell({
  id,
  hintId,
  errorId,
  label,
  srLabel,
  hint,
  error,
  optional,
  className = "",
  children,
}: FieldShellProps & { id: string; hintId: string; errorId: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={srLabel ? "sr-only" : "text-sm font-semibold text-dc-ink"}>
        {label}
        {optional && !srLabel && <span className="ml-1 font-normal text-dc-text-3">(opsional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-dc-text-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-dc-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(hint: unknown, error: unknown, hintId: string, errorId: string): string | undefined {
  return error ? errorId : hint ? hintId : undefined;
}

export function Input({
  label,
  srLabel,
  hint,
  error,
  className,
  optional,
  id: idProp,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & FieldShellProps) {
  const { id, hintId, errorId } = useFieldIds(idProp);
  return (
    <Shell {...{ id, hintId, errorId, label, srLabel, hint, error, className, optional }}>
      <input
        id={id}
        className={controlClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        {...props}
      />
    </Shell>
  );
}

export function Select({
  label,
  srLabel,
  hint,
  error,
  className,
  optional,
  id: idProp,
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & FieldShellProps) {
  const { id, hintId, errorId } = useFieldIds(idProp);
  return (
    <Shell {...{ id, hintId, errorId, label, srLabel, hint, error, className, optional }}>
      <div className="relative">
        <select
          id={id}
          className={`${controlClasses} cursor-pointer appearance-none pr-11`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hint, error, hintId, errorId)}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dc-text-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 8 5 5 5-5" />
        </svg>
      </div>
    </Shell>
  );
}

export function Textarea({
  label,
  srLabel,
  hint,
  error,
  className,
  optional,
  id: idProp,
  rows = 4,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & FieldShellProps) {
  const { id, hintId, errorId } = useFieldIds(idProp);
  return (
    <Shell {...{ id, hintId, errorId, label, srLabel, hint, error, className, optional }}>
      <textarea
        id={id}
        rows={rows}
        className={`${controlClasses} py-3 leading-relaxed`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        {...props}
      />
    </Shell>
  );
}
