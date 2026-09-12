import Link from "next/link";

import { ParallaxImage } from "@/components/landing/ParallaxImage";

export function CTABanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="relative">
        <div className="relative overflow-hidden rounded-3xl bg-dc-gold px-8 py-14 text-center sm:py-16">
          <svg
            className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 opacity-10"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="80" cy="100" r="55" stroke="#831843" strokeWidth="4" />
            <circle cx="130" cy="100" r="55" stroke="#831843" strokeWidth="4" />
          </svg>
          <h2 className="font-heading relative text-3xl font-extrabold text-dc-navy sm:text-4xl">
            Siap Rencanakan Pernikahanmu?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-dc-navy/80">
            Daftar gratis, cari vendor, dan susun budget dalam hitungan menit.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register?role=client" className="rounded-xl bg-dc-navy px-7 py-3 text-sm font-bold text-dc-white transition hover:scale-105">
              Daftar sebagai Client
            </Link>
            <Link href="/register?role=vendor" className="rounded-xl border border-dc-navy/30 px-7 py-3 text-sm font-semibold text-dc-navy transition hover:bg-dc-navy/10">
              Daftar Jadi Mitra Vendor
            </Link>
          </div>
        </div>

        {/* Deliberately breaks out of the box's edge instead of being
            clipped inside it, and responds to the cursor (tilt + scale on
            hover) — the one interactive photo on this section, not just a
            decorative parallax drift like the others. */}
        <ParallaxImage
          src="/hero/adat/sunda.webp"
          alt="Pasangan pengantin adat Sunda"
          className="-bottom-16 -right-10 z-10 hidden h-80 w-64 sm:block"
          speed={26}
          rotate={5}
          interactive
        />
      </div>
    </section>
  );
}
