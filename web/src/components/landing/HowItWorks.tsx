"use client";

import { motion, useReducedMotion } from "framer-motion";

const STEPS = [
  {
    title: "Cari & Chat",
    body: "Jelajahi direktori vendor per kategori, diskusikan kebutuhanmu langsung lewat chat aman DuaCincin.",
  },
  {
    title: "Booking & DP",
    body: "Sepakat harga, ajukan booking, bayar DP lewat escrow. Dana ditahan platform, bukan langsung ke vendor.",
  },
  {
    title: "Rencanakan Bersama",
    body: "Susun budget otomatis, checklist Wedding Planner, dan jadwalkan technical meeting dengan vendor.",
  },
  {
    title: "Hari Bahagia",
    body: "Lunasi pembayaran, vendor menjalankan tugasnya. Dana baru cair ke vendor setelah acara selesai.",
  },
];

// Alternating vertical offset per step, matching the wave the path below
// draws through the same 4 points, so the "journey to the wedding day"
// feels literal instead of a flat, generic progress bar.
const OFFSET = ["lg:-translate-y-4", "lg:translate-y-4", "lg:-translate-y-4", "lg:translate-y-4"];

export function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-heading text-3xl font-extrabold text-dc-navy">Cara Kerjanya</h2>
        <p className="mt-3 text-dc-black/60">Empat langkah, dari cari vendor sampai hari-H, semua tercatat dan terlindungi.</p>
      </div>

      <div className="relative mt-20 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <svg
          className="pointer-events-none absolute -top-6 left-0 hidden h-40 w-full lg:block"
          viewBox="0 0 1000 200"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <motion.path
            d="M100,60 C190,60 276,140 366,140 C456,140 543,60 633,60 C723,60 810,140 900,140"
            stroke="#F5A623"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="1 10"
            initial={{ pathLength: reduced ? 1 : 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: reduced ? 0 : 1.4, ease: "easeInOut" }}
          />
        </svg>

        {STEPS.map((step, i) => (
          <div key={step.title} className={`relative text-center ${OFFSET[i]}`}>
            <motion.div
              className="relative mx-auto h-16 w-16"
              initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
                <circle cx="32" cy="32" r="27" className="fill-none stroke-dc-gold" strokeWidth="3" />
                <circle cx="32" cy="32" r="22" className="fill-dc-navy" />
              </svg>
              <span className="font-heading absolute inset-0 flex items-center justify-center text-lg font-extrabold text-dc-white">
                {i + 1}
              </span>
            </motion.div>
            <h3 className="font-heading mt-4 font-bold text-dc-navy">{step.title}</h3>
            <p className="mt-2 text-sm text-dc-black/60">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
