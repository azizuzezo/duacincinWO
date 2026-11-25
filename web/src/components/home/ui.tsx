// Building blocks of the "Putih" design system (src/app/wd.css): buttons,
// section headings and small icons shared by the home page and /login.
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "gold" | "ink" | "outline" | "soft" | "white";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-wd-accent text-wd-ink hover:bg-wd-accent-deep",
  ink: "bg-wd-ink text-white hover:bg-black",
  outline: "border border-wd-line-2 bg-wd-white text-wd-ink hover:border-wd-ink",
  soft: "bg-wd-accent-soft text-wd-accent-ink hover:bg-[#f4dce1]",
  white: "bg-white text-wd-ink hover:bg-wd-blush",
};
const SIZES: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-12 px-6 text-[0.95rem]",
  lg: "min-h-14 px-8 text-base",
};

export function wdButton({ variant = "gold", size = "md", className = "" }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,border-color,color,transform] duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export function WdLink({ href, children, variant, size, className }: { href: string; children: ReactNode; variant?: Variant; size?: Size; className?: string }) {
  return (
    <Link href={href} className={wdButton({ variant, size, className })}>
      {children}
    </Link>
  );
}

/** Section heading, marketplace style: a bold sans title (an <em> inside
 * switches to the gold serif italic), an optional one-line note under it, and
 * an optional action (usually SeeAll) on the right, aligned to the title. */
export function SectionHead({
  id,
  title,
  sub,
  action,
  as: H = "h2",
}: {
  id: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <H id={id} className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
          {title}
        </H>
        {sub && <p className="mt-1.5 text-[0.95rem] text-wd-muted">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** "See all" link to a listing page. The arrow is the one place arrows are
 * used on the page: it marks a jump to a fuller list, not a button style. */
export function SeeAll({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-h-11 items-center gap-2 text-[0.95rem] font-semibold text-wd-ink underline decoration-wd-line-2 decoration-1 underline-offset-[6px] transition-colors hover:text-wd-accent-ink hover:decoration-wd-accent-ink">
      {children}
      <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

/** Failed-load panel with a retry, for sections fed by the public API. */
export function LoadError({ what, onRetry, href, hrefLabel }: { what: string; onRetry: () => void; href: string; hrefLabel: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 rounded-[22px] border border-wd-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-wd-text">{what} belum bisa dimuat. Periksa koneksi lalu coba lagi.</p>
      <div className="flex gap-2">
        <button type="button" onClick={onRetry} className={wdButton({ variant: "ink", size: "sm" })}>
          Coba lagi
        </button>
        <Link href={href} className={wdButton({ variant: "outline", size: "sm" })}>
          {hrefLabel}
        </Link>
      </div>
    </div>
  );
}

export function ArrowRight({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Star({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z" />
    </svg>
  );
}

export function Check({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function Shield({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
