import Image from "next/image";

import { Reveal } from "@/components/landing/Reveal";
import { ButtonLink } from "@/components/ui/Button";

const DOES = [
  "Mendengar kebutuhan, tanggal, dan anggaranmu lewat chat di akunmu.",
  "Merekomendasikan vendor yang cocok dari direktori DuaCincin.",
  "Menjadwalkan meeting lanjutan dan ikut technical meeting bila kamu minta.",
];

/** The one ink block of the home page: the human side of DuaCincin.
 * Photo in an arch frame (the shape of a wedding gapura). Copy describes only
 * what the consultation channel does in the product. */
export function ConsultantBlock() {
  return (
    <section aria-labelledby="konsultan-judul" className="dc-on-dark relative isolate overflow-hidden bg-dc-ink text-dc-on-dark">
      <div aria-hidden className="absolute -left-40 top-1/3 -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(220,187,118,0.16),transparent)]" />
      <div className="dc-container grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16 lg:py-36">
        <Reveal className="lg:col-span-6">
          <p className="dc-eyebrow">Wedding consultant</p>
          <h2 id="konsultan-judul" className="mt-4 font-heading text-[clamp(2.4rem,4.8vw,4.2rem)] leading-[1.02]">
            Belum tahu mulai dari mana? <span className="dc-em-light">Ngobrol dulu</span> dengan konsultan kami.
          </h2>
          <ul className="dc-stagger mt-8 flex flex-col gap-4">
            {DOES.map((d) => (
              <li key={d} className="flex gap-4 leading-relaxed text-dc-on-dark/85">
                <svg aria-hidden viewBox="0 0 26 16" fill="none" className="mt-1.5 h-4 w-[26px] shrink-0 text-dc-gold-antique">
                  <circle cx="9" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="17" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                {d}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/register?role=client" variant="gold">
              Buat akun dan mulai konsultasi
            </ButtonLink>
            <ButtonLink href="/cara-kerja" variant="ghostLight">
              Baca cara kerjanya
            </ButtonLink>
          </div>
        </Reveal>
        <Reveal className="lg:col-span-6" delay={0.1}>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[440px]">
            <div aria-hidden className="absolute -inset-3 rounded-t-full border border-dc-gold/40" />
            <div className="relative h-full overflow-hidden rounded-t-full bg-dc-ink-2">
              <Image
                src="/stock/couple-studio.webp"
                alt="Pasangan pengantin berbusana putih duduk bersama"
                fill
                sizes="(min-width: 1024px) 440px, 90vw"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
