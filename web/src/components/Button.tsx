"use client";

import type { ButtonHTMLAttributes } from "react";

import { Button as UIButton } from "@/components/ui/Button";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost";
};

/** Legacy full-width form button (auth and settings forms). Defaults to
 * type="submit" like the native element it replaced. New code uses
 * components/ui/Button directly; this keeps the old API on the new look. */
export function Button({ variant = "primary", type = "submit", ...props }: ButtonProps) {
  return <UIButton variant={variant} block type={type} {...props} />;
}
