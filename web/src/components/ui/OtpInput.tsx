"use client";

import { useId, useRef, useState } from "react";

/**
 * Six-digit code entry. One real <input> (so paste, SMS/email autofill and
 * screen readers work as for any text field) drawn as six boxes. The box for
 * the next digit carries the caret highlight.
 */
export function OtpInput({
  value,
  onChange,
  label = "Kode 6 digit",
  length = 6,
  invalid = false,
  autoFocus = false,
  onComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  length?: number;
  invalid?: boolean;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split("");
  const active = Math.min(value.length, length - 1);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-dc-text-2">
        {label}
      </label>
      <div className="relative" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(next);
            if (next.length === length) onComplete?.(next);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          required
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
        <div aria-hidden className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
          {Array.from({ length }).map((_, i) => {
            const filled = i < digits.length;
            const isActive = focused && i === active;
            return (
              <span
                key={i}
                className={`flex aspect-[4/5] max-h-16 items-center justify-center rounded-xl border bg-dc-white font-heading text-[1.75rem] leading-none text-dc-ink transition-[border-color,box-shadow,transform] duration-300 ease-dc ${
                  invalid
                    ? "border-dc-danger/60"
                    : isActive
                      ? "border-dc-gold shadow-[0_0_0_3px_rgba(184,146,74,0.22)]"
                      : filled
                        ? "border-dc-gold/50"
                        : "border-dc-line"
                } ${filled ? "motion-safe:animate-[dc-otp-pop_260ms_ease-out]" : ""}`}
              >
                {digits[i] ?? (isActive ? <span className="h-7 w-px animate-pulse bg-dc-gold" /> : "")}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
