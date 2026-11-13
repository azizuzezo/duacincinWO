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

import { PhoneFrame } from "@/components/ui/DeviceFrame";
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
      {/* Below lg the phone hangs off the bottom of the photo (stage padding),
          so it covers the couple's clothes, never their faces. */}
      <div ref={stage} className="relative pb-[210px] sm:pb-[330px] lg:h-auto lg:pb-0">
        <div className="relative h-[340px] sm:h-[420px] lg:absolute lg:inset-0 lg:h-auto">
          <Image src="/photos/pinterest/pasangan-sofa-bunga.webp" alt="Pasangan pengantin berbusana putih tersenyum di sofa, di depan dinding bunga merah, hasil kerja fotografer pernikahan" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[50%_62%]" />
        </div>
        <motion.div style={{ y: drift }} className="absolute bottom-0 right-[8%] w-[34%] max-w-[200px] lg:bottom-[8%] lg:right-[-9%] lg:w-[34%] lg:max-w-[230px]">
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
