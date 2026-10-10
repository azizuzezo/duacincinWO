import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";

/** Closing band: full-bleed photo so the page ends on the same cinematic
 * note it opened with. */
export function CTABanner() {
  return (
    <section className="relative isolate overflow-hidden bg-dc-ink">
      <Image src="/stock/couple-walk.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-dc-ink/70" aria-hidden />
      <Reveal className="mx-auto max-w-[1200px] px-4 py-28 text-center sm:px-6 lg:px-10 lg:py-40">
        <h2 className="mx-auto max-w-4xl font-heading text-[clamp(2.5rem,7vw,5.5rem)] font-medium leading-[1] text-dc-white">
          Mulai dari anggaran, <span className="dc-em-light">bukan dari tebakan.</span>
        </h2>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/register?role=client"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-dc-white px-8 text-sm font-semibold text-dc-ink transition-colors hover:bg-dc-gold-antique focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-white"
          >
            Buat akun client
          </Link>
          <Link
            href="/vendors"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-dc-white/50 px-8 text-sm font-semibold text-dc-white transition-colors hover:border-dc-white hover:bg-dc-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-white"
          >
            Lihat direktori vendor
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
