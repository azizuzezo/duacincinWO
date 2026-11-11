"use client";

// The human side of DuaCincin, shown: a photo in an arch frame (the shape of
// a wedding gapura) and, in front of it, the real consultation screen from the
// client account (public/showcase/konsultasi-phone.webp), which itself lists
// what the consultant does. Copy describes only what the consultation channel
// does in the product.
//
// Motion purpose: the phone drifts against the photo on scroll (it is the
// thing you hold, in front of the moment it serves). Reduced motion: still.
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { PhoneFrame } from "@/components/landing/Devices";
import { Reveal } from "@/components/landing/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { useReducedMotion } from "@/lib/motion";

export function ConsultantBlock() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -72]);

  return (
    <section aria-labelledby="konsultan-judul" className="overflow-hidden bg-dc-cream">
      <div className="dc-container py-20 text-center sm:py-28 lg:py-32">
        <Reveal>
          <p className="dc-eyebrow justify-center">Wedding consultant</p>
          <h2 id="konsultan-judul" className="mx-auto mt-4 max-w-3xl font-heading text-[clamp(2.5rem,5.4vw,4.6rem)] leading-[1] text-dc-ink">
            Bingung mulai dari mana? <span className="dc-em">Ngobrol dulu.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-dc-text-2">Konsultan kami merekomendasikan vendor dari direktori DuaCincin, lewat chat di akunmu.</p>
        </Reveal>

        <div ref={stage} className="relative mx-auto mt-14 w-full max-w-[520px] pb-12 pr-[20%] text-left">
          <div className="relative">
            <div aria-hidden className="absolute -inset-3 rounded-t-full border border-dc-gold/50" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-dc-paper-3">
              <Image src="/photos/momen/jember-tertawa-1400.webp" alt="Pasangan pengantin Jember Sari tertawa bersama, berkalung untaian melati" fill sizes="(min-width: 640px) 400px, 76vw" className="object-cover object-[50%_30%]" />
            </div>
          </div>
          <motion.div style={{ y: drift }} className="absolute bottom-0 right-0 w-[38%]">
            <PhoneFrame src="/showcase/konsultasi-phone.webp" alt="Halaman konsultasi di akun client: chat dengan wedding consultant dan jadwal video call" sizes="(min-width: 640px) 230px, 44vw" />
          </motion.div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/register?role=client" variant="gold">
            Mulai konsultasi
          </ButtonLink>
          <ButtonLink href="/cara-kerja" variant="ghost">
            Baca cara kerjanya
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
