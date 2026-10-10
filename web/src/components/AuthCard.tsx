import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "client" | "vendor" | "internal" | "unified";

const SIDE_CONTENT: Record<Variant, { headline: string; accent: string; bullets: string[] }> = {
  client: {
    headline: "Rencanakan pernikahan",
    accent: "tanpa drama vendor.",
    bullets: ["Direktori vendor terverifikasi", "Budget planner otomatis", "Pembayaran aman lewat escrow"],
  },
  vendor: {
    headline: "Fokus kerjakan acara,",
    accent: "biar DuaCincin urus bookingnya.",
    bullets: ["Booking & pembayaran terjamin", "Komisi jelas, dana cair otomatis", "Semua diskusi tercatat resmi"],
  },
  internal: {
    headline: "Panel internal",
    accent: "tim DuaCincin.",
    bullets: ["Verifikasi & moderasi vendor", "Pantau sengketa & pencairan dana", "Dashboard operasional real-time"],
  },
  // Role-agnostic copy for the single shared login page: we only learn the
  // role after submit, so nothing here can assume one.
  unified: {
    headline: "Satu pintu masuk",
    accent: "untuk seluruh DuaCincin.",
    bullets: ["Calon pengantin & vendor", "Tim internal DuaCincin", "Diarahkan otomatis ke dashboard yang tepat"],
  },
};

type AuthCardProps = {
  title: string;
  subtitle?: string;
  variant?: Variant;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, subtitle, variant = "client", children, footer }: AuthCardProps) {
  const side = SIDE_CONTENT[variant];

  return (
    <main className="flex min-h-screen bg-dc-ivory">
      {/* Brand panel: full-bleed photo (placeholder stock, public/stock/README.md)
          with a flat ink veil so the copy clears AA contrast anywhere on the image. */}
      <div className="relative isolate hidden w-[46%] flex-col justify-between overflow-hidden bg-dc-ink p-12 md:flex">
        <Image src="/stock/couple-walk.webp" alt="" fill sizes="46vw" priority className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-dc-ink/60" aria-hidden />

        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/duacincin-logo.webp" alt="" width={32} height={32} />
          <span className="font-heading text-xl text-dc-white">DuaCincin</span>
        </Link>

        <div>
          <p className="font-heading text-4xl leading-[1.1] text-dc-white lg:text-5xl">
            {side.headline} <span className="dc-em-light">{side.accent}</span>
          </p>
          <ul className="mt-6 flex flex-col gap-2">
            {side.bullets.map((b) => (
              <li key={b} className="text-sm text-dc-white/90">
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs text-dc-white/75">© {new Date().getFullYear()} DuaCincin</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <Link href="/" className="mb-10 flex items-center gap-2.5 md:hidden">
          <Image src="/brand/duacincin-logo.webp" alt="" width={32} height={32} />
          <span className="font-heading text-xl text-dc-ink">DuaCincin</span>
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="font-heading text-4xl leading-[1.05] text-dc-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-dc-black/70">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-center text-sm text-dc-black/70">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
