"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { ParallaxImage } from "@/components/landing/ParallaxImage";
import { FeatureIcon } from "@/components/ui/FeatureIcon";

const FEATURES = [
  {
    title: "Escrow Payment Terlindungi",
    body: "DP & pelunasan ditahan platform lewat Midtrans, baru cair ke vendor setelah acara selesai dikonfirmasi. Uangmu tidak pernah langsung berpindah tangan tanpa jaminan.",
    image: "/hero/adat/bugis.webp",
    imageAlt: "Pasangan pengantin adat Bugis",
    icon: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Direktori Vendor Terverifikasi",
    body: "Setiap vendor direview Admin sebelum tampil: dekorasi, MUA, fotografer, catering, dan lainnya.",
    image: "/hero/adat/jawa.webp",
    imageAlt: "Pasangan pengantin adat Jawa",
    icon: (
      <path d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Budget Planner Otomatis",
    body: "Masukkan total budget, langsung terbagi ke tiap kategori. Geser slider untuk sesuaikan sendiri.",
    image: "/hero/adat/minang.webp",
    imageAlt: "Pasangan pengantin adat Minang",
    icon: <path d="M12 2v10l7 5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Wedding Planner Checklist",
    body: "Timeline H-12 bulan sampai hari-H, otomatis tercentang begitu kamu booking vendor terkait.",
    image: "/hero/adat/sunda.webp",
    imageAlt: "Pasangan pengantin adat Sunda",
    icon: (
      <path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Chat & Booking Aman",
    body: "Semua diskusi dan kesepakatan tercatat di platform, jadi bukti kuat kalau ada sengketa.",
    image: "/hero/adat/dayak.webp",
    imageAlt: "Pasangan pengantin adat Dayak",
    icon: (
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Inspirasi Asli Indonesia",
    body: "Galeri kurasi foto pernikahan nyata. Bukan hasil AI, bukan stok luar negeri.",
    image: "/hero/adat/barat.webp",
    imageAlt: "Pasangan pengantin gaya Barat",
    icon: <path d="M4 16l4.5-6 3.5 4.5 2.5-3L20 16M4 5h16v14H4V5Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

const ROTATE_MS = 5000;

export function FeaturesGrid() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || paused) return;
    const interval = setInterval(() => setActive((i) => (i + 1) % FEATURES.length), ROTATE_MS);
    return () => clearInterval(interval);
  }, [reduced, paused]);

  const current = FEATURES[active];

  return (
    <section className="bg-dc-offwhite py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-dc-navy">Semua yang Kamu Butuhkan</h2>
          <p className="mt-3 text-dc-black/60">Dari cari vendor sampai bayar aman, satu platform, satu alur.</p>
        </div>

        <div
          className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl bg-dc-navy p-8 text-dc-white shadow-md shadow-dc-navy/10">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: reduced ? 1 : 0 }}
                  transition={{ duration: reduced ? 0 : 0.35, ease: "easeOut" }}
                >
                  <div className="inline-block rounded-full bg-dc-white/10 p-3">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {current.icon}
                    </svg>
                  </div>
                  <h3 className="font-heading relative mt-5 text-2xl font-bold">{current.title}</h3>
                  <p className="relative mt-3 max-w-[75%] text-dc-white/70">{current.body}</p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots double as a manual jump control, mirroring the
                  Hero carousel's pattern so the two feel like one system. */}
              <div className="relative mt-8 flex gap-1.5">
                {FEATURES.map((f, i) => (
                  <button
                    key={f.title}
                    type="button"
                    aria-label={`Tampilkan ${f.title}`}
                    aria-current={i === active}
                    onClick={() => setActive(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === active ? "w-5 bg-dc-gold" : "w-1.5 bg-dc-white/30 hover:bg-dc-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Sits outside the navy box's own overflow-hidden so the photo
                is never clipped mid-body no matter which of the 6 photos
                (each framed slightly differently) is currently active. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: reduced ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 0.4, ease: "easeOut" }}
                className="contents"
              >
                <ParallaxImage
                  src={current.image}
                  alt={current.imageAlt}
                  className="-bottom-8 -right-6 z-10 hidden h-60 w-48 sm:block"
                  speed={24}
                  rotate={-4}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="divide-y divide-dc-black/5">
            {FEATURES.map((f, i) => (
              <button
                key={f.title}
                type="button"
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`flex w-full items-start gap-4 rounded-xl py-4 pl-3 pr-4 text-left transition first:mt-0 last:mb-0 ${
                  i === active ? "bg-dc-navy/5" : "hover:bg-dc-navy/3"
                }`}
              >
                <FeatureIcon>{f.icon}</FeatureIcon>
                <div>
                  <h3 className={`font-heading font-bold transition ${i === active ? "text-dc-gold" : "text-dc-navy"}`}>{f.title}</h3>
                  <p className="mt-1 text-sm text-dc-black/60">{f.body}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
