import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

/**
 * Brand buttons (same family as invitation.duacincin.id .dc-btn).
 * - primary: ink pill, the default action on paper.
 * - gold: the ONE most important action of a screen (hero search, pay, book).
 * - ghost: secondary action on paper. ghostLight: secondary on ink/photo.
 * - light: primary action on ink/photo.
 * - quiet: text-weight action inside cards and tables (underlined on hover).
 * - danger: destructive confirmation only.
 * All sizes keep a 44px minimum touch target (sm is 44, md 48, lg 56).
 */
export type ButtonVariant = "primary" | "gold" | "ghost" | "ghostLight" | "light" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,box-shadow,background-color,color,border-color] duration-300 ease-dc focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-safe:active:scale-[0.98]";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "rounded-full bg-dc-ink text-dc-on-dark hover:bg-dc-ink-2 motion-safe:hover:-translate-y-0.5 hover:shadow-lift",
  gold: "rounded-full bg-linear-135 from-dc-gold-antique to-dc-gold text-dc-ink shadow-[inset_0_1px_0_color-mix(in_srgb,white_35%,transparent)] motion-safe:hover:-translate-y-0.5 hover:shadow-gold",
  ghost: "rounded-full border border-dc-line-strong bg-transparent text-dc-ink hover:border-dc-ink hover:bg-dc-ink/[0.03]",
  ghostLight: "rounded-full border border-dc-on-dark/35 bg-dc-ink/25 text-dc-on-dark hover:border-dc-on-dark hover:bg-dc-on-dark/10",
  light: "rounded-full bg-dc-on-dark text-dc-ink hover:bg-dc-white motion-safe:hover:-translate-y-0.5 hover:shadow-lift",
  quiet: "rounded-md px-2! text-dc-clay underline-offset-4 hover:bg-dc-cream hover:underline",
  danger: "rounded-full bg-dc-danger text-white hover:bg-dc-danger-strong",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-6 text-[0.95rem]",
  lg: "min-h-14 px-8 text-base",
};

/** Class string for any element that should look like a button (e.g. a <label> or <a>). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`;
}

function Spinner() {
  return <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

export function Button({
  variant,
  size,
  block,
  loading = false,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Common & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/** Same look as Button for navigation. Internal hrefs use next/link. */
export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & Common) {
  return <Link className={buttonClasses({ variant, size, block, className })} {...props} />;
}
