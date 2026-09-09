import Link from "next/link";

import { Reveal } from "@/components/Reveal";

export function CTABanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <Reveal className="relative overflow-hidden rounded-3xl bg-dc-gold px-8 py-14 text-center sm:py-16">
        <svg
          className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 opacity-10"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="80" cy="100" r="55" stroke="#152238" strokeWidth="4" />
          <circle cx="130" cy="100" r="55" stroke="#152238" strokeWidth="4" />
        </svg>
        <h2 className="font-heading relative text-3xl font-extrabold text-dc-navy sm:text-4xl">
          Siap Rencanakan Pernikahanmu?
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-dc-navy/80">
          Daftar gratis, cari vendor, dan susun budget dalam hitungan menit.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/client/register" className="rounded-full bg-dc-navy px-7 py-3 text-sm font-bold text-dc-white transition hover:scale-105">
            Daftar sebagai Client
          </Link>
          <Link href="/vendor/register" className="rounded-full border border-dc-navy/30 px-7 py-3 text-sm font-semibold text-dc-navy transition hover:bg-dc-navy/10">
            Daftar Jadi Mitra Vendor
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
