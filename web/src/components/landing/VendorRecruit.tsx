"use client";

// Vendor recruitment, split screen: a full-bleed half photo of a working
// photographer and, in front, the real vendor "Hari ini" screen (public/showcase/
// vendordash-phone.webp). Three real onboarding steps, one line each.
//
// Motion purpose: the phone drifts against the photo on scroll (depth, the
// tool in front of the craft). Reduced motion: still.
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { PhoneFrame } from "@/components/landing/Devices";
import { Reveal } from "@/components/landing/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { useReducedMotion } from "@/lib/motion";

const STEPS = ["Daftar, lengkapi profil dan portofolio", "Tim DuaCincin memverifikasi akunmu", "Terima booking lewat chat, dana cair setelah acara selesai"];

export function VendorRecruit() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -90]);

  return (
    <section aria-labelledby="vendor-judul" className="relative overflow-hidden bg-dc-ivory lg:grid lg:min-h-[640px] lg:grid-cols-2">
      {/* Full-bleed half: the craft, with the vendor's real "Hari ini" screen in front. */}
      <div ref={stage} className="relative h-[420px] sm:h-[520px] lg:h-auto">
        <Image src="/photos/kategori/foto-1400.webp" alt="Potret pengantin Bali bermahkota emas, hasil kerja fotografer pernikahan" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[50%_30%]" />
        <motion.div style={{ y: drift }} className="absolute bottom-[-6%] right-[8%] w-[38%] max-w-[230px] lg:bottom-[8%] lg:right-[-9%] lg:w-[34%]">
          <PhoneFrame src="/showcase/vendordash-phone.webp" alt="Halaman Hari ini di dashboard vendor: permintaan baru dan acara terdekat" sizes="230px" />
        </motion.div>
      </div>

      <Reveal className="flex flex-col justify-center px-4 py-20 sm:px-12 lg:py-24 lg:pl-[9vw] lg:pr-[max(3rem,calc((100vw-1240px)/2+3rem))]">
        <p className="dc-eyebrow">Untuk vendor</p>
        <h2 id="vendor-judul" className="mt-4 max-w-xl font-heading text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02] text-dc-ink">
          Punya usaha pernikahan? <span className="dc-em">Tampilkan karyamu.</span>
        </h2>
        <ol className="dc-stagger mt-8 flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-baseline gap-4 leading-relaxed text-dc-text-2">
              <span className="font-heading text-3xl leading-none text-dc-clay [font-variant-numeric:lining-nums]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/register?role=vendor">Daftar sebagai vendor</ButtonLink>
          <ButtonLink href="/untuk-vendor" variant="ghost">
            Pelajari untuk vendor
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
