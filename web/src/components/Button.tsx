"use client";

import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost";
};

export function Button({ loading, variant = "primary", children, className, disabled, ...props }: ButtonProps) {
  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-dc-navy text-dc-white hover:bg-dc-gold hover:text-dc-navy"
      : "bg-transparent text-dc-navy hover:bg-dc-offwhite";

  return (
    <button className={`${base} ${styles} ${className ?? ""}`} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
