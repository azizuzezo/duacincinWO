import Image from "next/image";

import { Reveal } from "@/components/landing/Reveal";
import { ButtonLink } from "@/components/ui/Button";

/** Closing band: full-bleed photo under an ink veil, one script word, two
 * specific actions. Ends the page on the same cinematic note it opened with. */
export function CTABanner() {
  return (
    <section aria-labelledby="penutup-judul" className="dc-on-dark relative isolate overflow-hidden bg-dc-ink">
      <Image src="/stock/couple-walk.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(21,17,13,0.6),rgba(21,17,13,0.85))]" aria-hidden />
      <Reveal className="dc-container py-28 text-center sm:py-36 lg:py-44">
        <h2 id="penutup-judul" className="mx-auto max-w-4xl font-heading text-[clamp(2.6rem,6.6vw,5.6rem)] font-medium leading-[1] text-[#fbf6ec]">
          Mulai dari anggaran, <span className="dc-script-light text-[1.15em]">bukan tebakan</span>.
        </h2>
        <p className="mx-auto mt-6 max-w-lg leading-relaxed text-[#fbf6ec]/85">
          Buat akun, susun budget, lalu temukan vendor yang pas dengan anggaranmu.
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <ButtonLink href="/register?role=client" variant="gold" size="lg">
            Buat akun client
          </ButtonLink>
          <ButtonLink href="/vendors" variant="ghostLight" size="lg">
            Lihat direktori vendor
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
