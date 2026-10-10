"use client";

import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost";
};

// Square-ish (6px) and 44px tall: pill buttons are reserved for status Badges,
// so actions read as editorial rectangles (DESIGN.md "Bentuk").
export function Button({ loading, variant = "primary", children, className, disabled, ...props }: ButtonProps) {
  const base =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-dc-ink text-dc-white hover:bg-dc-clay"
      : "border border-dc-ink/25 bg-transparent text-dc-ink hover:border-dc-ink hover:bg-dc-white";

  return (
    <button className={`${base} ${styles} ${className ?? ""}`} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
