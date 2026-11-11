"use client";

// "How escrow protects you" as a picture, not a paragraph. Three places the
// money can be, one gold coin, and the real booking screen of each moment.
// Motion purpose: when the panel enters the viewport the coin walks the
// route once (you pay, it waits, it moves only after you confirm), then the
// reader can step through it with the buttons. Reduced motion: no autoplay,
// the coin jumps between stations and screens cross-fade.

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { FundStatus } from "@/components/ui/FundStatus";
import type { BookingStatus } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

import { PhoneFrame } from "../cara-kerja/DeviceFrame";

const STEPS: { place: string; title: string; body: string; status: BookingStatus; screen: string; alt: string }[] = [
  {
    place: "Kamu",
    title: "Kamu membayar lewat DuaCincin",
    body: "DP 30% dan pelunasan dibayar di halaman booking, bukan ke rekening pribadi vendor.",
    status: "dp_paid",
    screen: "/showcase/pages/k3-vendor.webp",
    alt: "Halaman vendor dengan penjelasan uang dijaga escrow DuaCincin",
  },
  {
    place: "Escrow DuaCincin",
    title: "Dana ditahan sampai hari-H",
    body: "Uangmu menunggu di akun penampung DuaCincin. Vendor bisa melihat dananya sudah ada, tapi belum menerimanya.",
    status: "full_paid",
    screen: "/showcase/pages/k4-dp.webp",
    alt: "Detail booking dengan status DP dibayar, dana ditahan escrow",
  },
  {
    place: "Vendor",
    title: "Kamu konfirmasi, baru diteruskan",
    body: "Setelah kamu menyatakan acara selesai, dana diteruskan ke vendor dikurangi komisi. Ada masalah? Ajukan sengketa, Admin menengahi.",
    status: "completed",
    screen: "/showcase/pages/k7-selesai.webp",
    alt: "Booking berstatus selesai setelah client mengonfirmasi acara",
  },
];

export function EscrowPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduced = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);

  // One guided walk through the route when the panel is first seen.
  useEffect(() => {
    if (!inView || reduced || touched) return;
    if (step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2600);
    return () => clearTimeout(t);
  }, [inView, reduced, touched, step]);

  const s = STEPS[step];
  const choose = (i: number) => {
    setTouched(true);
    setStep(i);
  };

  return (
    <div ref={ref} className="dc-on-dark relative isolate overflow-hidden rounded-3xl bg-dc-ink p-6 text-dc-on-dark shadow-float sm:p-10 lg:p-12">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-7">
          <p className="dc-eyebrow is-light">Escrow, dalam satu gambar</p>
          <h2 id="escrow-judul" className="mt-4 font-heading text-[clamp(2rem,3.8vw,3.1rem)] leading-[1.04] text-dc-on-dark">
            Bagaimana escrow <span className="dc-em-light">melindungimu.</span>
          </h2>

          {/* The route: three stations, one coin. */}
          <ol className="relative mt-9 grid grid-cols-3 gap-2">
            <span aria-hidden className="absolute left-[16.6%] right-[16.6%] top-5 h-px bg-[repeating-linear-gradient(90deg,rgba(246,239,227,0.35)_0_6px,transparent_6px_12px)]" />
            {STEPS.map((st, i) => {
              const here = i === step;
              return (
                <li key={st.place} className="relative flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-pressed={here}
                    aria-label={`${i + 1}. ${st.title}`}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-500 active:scale-95 ${
                      here ? "border-dc-gold-antique bg-dc-ink-2" : "border-dc-on-dark/30 bg-dc-ink hover:border-dc-on-dark/70"
                    }`}
                  >
                    {here ? (
                      <motion.span
                        layoutId={reduced ? undefined : "escrow-coin"}
                        transition={SPRING_SNAPPY}
                        aria-hidden
                        className="h-5 w-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3dc9f,#c39c52_55%,#8a682b)] shadow-gold"
                      />
                    ) : (
                      <span aria-hidden className="text-sm font-semibold text-dc-on-dark/75">
                        {i + 1}
                      </span>
                    )}
                  </button>
                  <span className={`mt-3 text-sm font-semibold transition-colors duration-500 ${here ? "text-dc-gold-antique" : "text-dc-on-dark/75"}`}>{st.place}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-8 min-h-[11rem] rounded-2xl border border-dc-on-dark/15 bg-dc-ink-2 p-5 sm:p-6" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: reduced ? 0.15 : 0.35, ease: EASE }}
              >
                <p className="font-heading text-[1.6rem] leading-tight text-dc-on-dark">{s.title}</p>
                <p className="mt-2 leading-relaxed text-dc-on-dark/80">{s.body}</p>
                <div className="mt-4 inline-flex rounded-xl bg-dc-ivory px-3 py-2">
                  <FundStatus status={s.status} compact />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center lg:col-span-5">
          <div className="relative w-[min(78%,280px)]" style={{ aspectRatio: "280 / 520" }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={s.screen}
                className="absolute inset-0"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: reduced ? 0.2 : 0.6, ease: EASE }}
              >
                <PhoneFrame src={s.screen} alt={s.alt} sizes="280px" crop="390 / 720" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
