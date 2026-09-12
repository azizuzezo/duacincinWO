import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "client" | "vendor" | "internal" | "unified";

const SIDE_CONTENT: Record<Variant, { headline: string; bullets: string[] }> = {
  client: {
    headline: "Rencanakan pernikahan tanpa drama vendor.",
    bullets: ["Direktori vendor terverifikasi", "Budget planner otomatis", "Pembayaran aman lewat escrow"],
  },
  vendor: {
    headline: "Fokus kerjakan acara, biar DuaCincin urus bookingnya.",
    bullets: ["Booking & pembayaran terjamin", "Komisi jelas, dana cair otomatis", "Semua diskusi tercatat resmi"],
  },
  internal: {
    headline: "Panel internal untuk tim DuaCincin.",
    bullets: ["Verifikasi & moderasi vendor", "Pantau sengketa & pencairan dana", "Dashboard operasional real-time"],
  },
  // Role-agnostic copy for the single shared login page. We don't know
  // whether it's a client, vendor, admin, or wedding consultant signing in
  // until after they submit, so nothing here can assume one.
  unified: {
    headline: "Satu pintu masuk untuk seluruh DuaCincin.",
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
    <main className="flex min-h-screen bg-dc-white">
      {/* Brand panel — hidden on mobile, shown from md up */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-dc-navy via-dc-navy/95 to-dc-black p-10 md:flex">
        <svg
          className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 animate-spin-slow opacity-[0.08]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="80" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
          <circle cx="130" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
        </svg>

        <Link href="/" className="relative flex items-center gap-2">
          <Image src="/brand/duacincin-logo.webp" alt="DuaCincin" width={36} height={36} />
          <span className="font-heading text-lg font-extrabold text-dc-white">DuaCincin</span>
        </Link>

        <div className="relative">
          <p className="font-heading text-3xl font-extrabold leading-snug text-dc-white">{side.headline}</p>
          <ul className="mt-8 flex flex-col gap-3">
            {side.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-dc-white/70">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="3" className="shrink-0">
                  <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-dc-white/30">© {new Date().getFullYear()} DuaCincin</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2 md:hidden">
          <Image src="/brand/duacincin-logo.webp" alt="DuaCincin" width={36} height={36} />
          <span className="font-heading text-lg font-extrabold text-dc-navy">DuaCincin</span>
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="font-heading text-2xl font-extrabold text-dc-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-dc-black/60">{subtitle}</p>}

          <div className="mt-6">{children}</div>

          {footer && <div className="mt-6 text-center text-sm text-dc-black/60">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
