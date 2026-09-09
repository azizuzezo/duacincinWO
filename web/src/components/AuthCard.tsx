import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ eyebrow, title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dc-offwhite px-4 py-12">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Image src="/brand/duacincin-logo.webp" alt="DuaCincin" width={40} height={40} />
        <span className="font-heading text-lg font-extrabold text-dc-navy">DuaCincin</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-dc-black/10 bg-dc-white p-8 shadow-sm">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-wide text-dc-gold uppercase">{eyebrow}</p>
        )}
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-dc-black/60">{subtitle}</p>}

        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-6 text-center text-sm text-dc-black/60">{footer}</div>}
    </main>
  );
}
