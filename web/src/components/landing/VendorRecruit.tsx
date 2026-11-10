import Image from "next/image";

import { Reveal } from "@/components/landing/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { VENDOR_CATEGORIES } from "@/lib/api";

const STEPS = ["Daftar dan lengkapi profil serta portofolio", "Tim DuaCincin memverifikasi akunmu", "Terima booking lewat chat, dana cair setelah acara selesai"];

/** Vendor recruitment: a framed photo that tilts slightly into place, the
 * three real onboarding steps, and the category list. */
export function VendorRecruit() {
  return (
    <section aria-labelledby="vendor-judul" className="bg-dc-ivory">
      <div className="dc-container grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-12 lg:gap-20 lg:py-36">
        <Reveal className="order-2 lg:order-1 lg:col-span-5">
          <div className="group relative mx-auto max-w-sm lg:max-w-none">
            <div aria-hidden className="absolute -left-4 -top-4 h-full w-full rounded-2xl border border-dc-gold/50 transition-transform duration-700 ease-dc group-hover:translate-x-2 group-hover:translate-y-2" />
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-dc-ink shadow-lift">
              <Image src="/stock/photographer.webp" alt="Fotografer pernikahan memotret pasangan lewat kamera" fill sizes="(min-width: 1024px) 440px, 90vw" className="object-cover transition-transform duration-700 ease-dc group-hover:scale-[1.04] motion-reduce:transition-none" />
            </div>
          </div>
        </Reveal>
        <Reveal className="order-1 lg:order-2 lg:col-span-7">
          <p className="dc-eyebrow">Untuk vendor</p>
          <h2 id="vendor-judul" className="mt-4 font-heading text-[clamp(2.4rem,4.8vw,4.2rem)] leading-[1.02] text-dc-ink">
            Punya usaha pernikahan? <span className="dc-em">Tampilkan karyamu</span> ke calon pengantin.
          </h2>
          <ol className="dc-stagger mt-8 flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-baseline gap-4 text-dc-text-2">
                <span className="font-heading text-2xl leading-none text-dc-clay [font-variant-numeric:lining-nums]">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm font-semibold text-dc-ink">Kategori yang tersedia</p>
          <ul className="dc-stagger mt-3 flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((c) => (
              <li key={c.value} className="rounded-full border border-dc-line-strong bg-dc-white px-3.5 py-1.5 text-sm text-dc-text-2">
                {c.label}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/register?role=vendor">Daftar sebagai vendor</ButtonLink>
            <ButtonLink href="/untuk-vendor" variant="ghost">
              Pelajari untuk vendor
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
