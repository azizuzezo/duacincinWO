"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

// Real couples in traditional dress from across Indonesia — each region shot
// separately, not one couple re-costumed, so the carousel actually shows the
// country's range rather than a single look repeated. `scale` corrects for
// each source photo framing the couple at a different size within the same
// canvas (measured from each file's real alpha-channel bounding box, not
// guessed) so nobody visibly "jumps" bigger or smaller between slides —
// scale = target-fill-ratio / (photo's own measured subject-height ÷ canvas
// height). Raising the shared target (currently ~95%, up from ~85%) makes
// every slide bigger by the same proportion at once — it can't widen the
// gap between slides, since they're all still hitting the same target.
const SLIDES = [
  { src: "/hero/adat/melayu.webp", label: "Adat Melayu", scale: 1.12 },
  { src: "/hero/adat/jawa.webp", label: "Adat Jawa", scale: 1.36 },
  { src: "/hero/adat/minang.webp", label: "Adat Minang", scale: 1.24 },
  { src: "/hero/adat/bugis.webp", label: "Adat Bugis", scale: 1.13 },
  { src: "/hero/adat/sunda.webp", label: "Adat Sunda", scale: 1.64 },
  { src: "/hero/adat/dayak.webp", label: "Adat Dayak", scale: 1.07 },
  { src: "/hero/adat/barat.webp", label: "Gaya Barat", scale: 1.14 },
];

const ROTATE_MS = 6000;
const HEADLINE_LINES = ["Rencanakan Pernikahan Impian,", "Tanpa Drama Vendor."];

// Dissolves each photo's own bottom edge into transparency so it blends into
// the navy background smoothly instead of showing a hard crop line.
const BOTTOM_FADE_MASK = "linear-gradient(to bottom, black 80%, transparent 98%)";

export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || paused) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(interval);
  }, [reduced, paused]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-dc-navy via-dc-navy/95 to-dc-black">
      {/* Brand ring motif: subtle, slow-spinning, thematically tied to
          "DuaCincin" (two rings) rather than a generic decorative blob. */}
      <svg
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] animate-spin-slow opacity-[0.08] sm:h-[560px] sm:w-[560px]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="80" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
        <circle cx="130" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
      </svg>

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-20 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4 lg:py-28">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <h1 className="font-heading text-4xl font-extrabold leading-tight text-dc-white sm:text-5xl">
            {HEADLINE_LINES.map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: reduced ? 0 : "100%" }}
                  animate={{ y: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <p className="animate-fade-up mt-5 text-lg text-dc-white/70" style={{ animationDelay: "220ms" }}>
            DuaCincin menghubungkanmu dengan vendor pernikahan terverifikasi di seluruh Indonesia: cari, chat,
            booking, dan bayar, semua aman dalam satu platform.
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            style={{ animationDelay: "300ms" }}
          >
            <Link
              href="/register?role=client"
              className="rounded-xl bg-dc-gold px-7 py-3 text-sm font-bold text-dc-navy shadow-lg shadow-dc-gold/20 transition hover:scale-105 hover:bg-dc-white"
            >
              Mulai Cari Vendor, Gratis
            </Link>
            <Link
              href="/register?role=vendor"
              className="rounded-xl border border-dc-white/20 px-7 py-3 text-sm font-semibold text-dc-white transition hover:bg-dc-white/10"
            >
              Daftar Jadi Mitra Vendor
            </Link>
          </div>
        </div>

        {/* Couple visual: real photography of couples in traditional dress
            from across Indonesia, rotating every 6s. Pauses on hover/focus.
            `lg:aspect-[10/9]` (rather than a fixed height) keeps every
            slide's photo flush against the top of its box at desktop
            width — `barat.webp` is the one square (1:1) source among
            otherwise-portrait photos, and a box aspect ratio below 1:1
            would make it hit its width limit before its height limit,
            leaving an empty gap above it that the other slides don't have. */}
        <div
          className="animate-fade-up relative mx-auto h-90 w-85 sm:h-115 sm:w-110 lg:aspect-10/9 lg:h-auto lg:w-full"
          style={{ animationDelay: "380ms" }}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          <div className="pointer-events-none absolute inset-0 rounded-full bg-dc-rose/10 blur-3xl" />

          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: reduced ? 1 : 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
            >
              <Image
                src={SLIDES[index].src}
                alt={`Pasangan pengantin ${SLIDES[index].label}`}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 620px, 440px"
                className="object-contain object-bottom drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]"
                style={{
                  transform: `scale(${SLIDES[index].scale})`,
                  transformOrigin: "bottom center",
                  WebkitMaskImage: BOTTOM_FADE_MASK,
                  maskImage: BOTTOM_FADE_MASK,
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
