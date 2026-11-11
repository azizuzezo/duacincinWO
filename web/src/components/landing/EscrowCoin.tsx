"use client";

// Escrow in one interactive picture: three stations (Kamu, Escrow DuaCincin,
// Vendor) and one gold coin. As the card scrolls through the screen the
// booking advances stage by stage and the coin travels to where the money
// really is; drag the slider or tap a stage to take over. The FundStatus under
// it is the same component the app shows on every booking. Claims mirror PRD
// §8.5/§8.11 (Midtrans into DuaCincin's holding account, released after the
// client confirms the event, minus platform commission).
//
// Motion purpose: the coin is the message (spring = physical weight, it moves
// only when the stage changes); the gold track fills to the current stage.
// Reduced motion: no scroll-driven stepping (starts at "Bayar DP"), the coin
// appears at its station without travel.
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { FundStatus } from "@/components/ui/FundStatus";
import type { BookingStatus } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

type Station = 0 | 1 | 2;

const STAGES: { station: Station; status: BookingStatus; short: string; title: string; body: string }[] = [
  { station: 0, status: "requested", short: "Ajukan", title: "Booking diajukan", body: "Tanggal dan paket hasil chat kamu ajukan. Belum ada uang yang berpindah." },
  { station: 0, status: "confirmed", short: "Disetujui", title: "Vendor mengonfirmasi", body: "Tinggal bayar DP untuk mengunci tanggal." },
  { station: 1, status: "dp_paid", short: "Bayar DP", title: "DP masuk ke escrow", body: "Dibayar lewat Midtrans ke akun penampung DuaCincin, belum ke vendor." },
  { station: 1, status: "full_paid", short: "Pelunasan", title: "Pelunasan tetap ditahan", body: "Sampai hari-H, uangmu tetap di escrow." },
  { station: 2, status: "completed", short: "Selesai", title: "Kamu konfirmasi, dana diteruskan", body: "Setelah acara selesai, dana diteruskan ke vendor, dikurangi komisi platform." },
];

const STATIONS = ["Kamu", "Escrow DuaCincin", "Vendor"];

const GUARDS = [
  { title: "Bukti tercatat", body: "Chat dan booking tersimpan untuk rujukan bila ada sengketa." },
  { title: "Chat diawasi", body: "Nomor telepon dan tautan luar ditandai untuk ditinjau Admin." },
  { title: "Vendor terikat perjanjian", body: "Setiap vendor menyetujui Perjanjian Kemitraan." },
];

export function EscrowCoin() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(2);
  const [touched, setTouched] = useState(false);
  // Animate the stage text only after the first change, so the server HTML
  // and the first client render match (and the text is visible without JS).
  const [changed, setChanged] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: card, offset: ["start 0.8", "end 0.45"] });
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!mounted.current || touched || reduced) return;
    const n = Math.min(STAGES.length - 1, Math.max(0, Math.round(p * (STAGES.length - 1))));
    if (n !== stage) {
      setStage(n);
      setChanged(true);
    }
  });
  const s = STAGES[stage];

  function pick(n: number) {
    setTouched(true);
    setChanged(true);
    setStage(n);
  }

  return (
    <section id="alur-booking" aria-labelledby="escrow-judul" className="dc-grain relative scroll-mt-20 overflow-hidden bg-dc-ivory">
      <div className="dc-container py-20 sm:py-28 lg:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="dc-eyebrow justify-center">Pembayaran escrow</p>
          <h2 id="escrow-judul" className="mt-4 font-heading text-[clamp(2.5rem,5.4vw,4.6rem)] leading-[1] text-dc-ink">
            Uangmu pindah tangan <span className="dc-em">setelah acara selesai.</span>
          </h2>
          <p className="mt-5 text-dc-text-2">Ikuti koin emasnya.</p>
        </Reveal>

        <div ref={card} className="mx-auto mt-12 max-w-5xl rounded-[2rem] border border-dc-line bg-dc-white p-5 shadow-lift sm:p-10">
          {/* Stations */}
          <ol aria-label="Posisi uangmu" className="relative grid grid-cols-3">
            <span aria-hidden className="absolute left-[16.6%] right-[16.6%] top-10 h-px bg-[repeating-linear-gradient(90deg,var(--dc-line-strong)_0_6px,transparent_6px_12px)] sm:top-14" />
            {STATIONS.map((label, i) => {
              const here = i === s.station;
              return (
                <li key={label} className="relative flex flex-col items-center text-center" aria-current={here ? "location" : undefined}>
                  <span
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-[border-color,background-color,transform] duration-500 sm:h-28 sm:w-28 ${
                      here ? "scale-105 border-dc-gold bg-dc-cream" : "border-dc-line bg-dc-white"
                    }`}
                  >
                    {i === 1 && (
                      <svg aria-hidden viewBox="0 0 64 40" fill="none" className="absolute -top-3 h-6 w-10 text-dc-gold sm:-top-4 sm:h-8 sm:w-12">
                        <circle cx="24" cy="20" r="14" stroke="currentColor" strokeWidth="2" />
                        <circle cx="40" cy="20" r="14" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    )}
                    {here && (
                      <motion.span layoutId={reduced ? undefined : "escrow-coin"} transition={SPRING_SNAPPY} aria-hidden>
                        <span className="block h-9 w-9 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3dc9f,#c39c52_55%,#8a682b)] shadow-gold sm:h-12 sm:w-12" />
                      </motion.span>
                    )}
                  </span>
                  <span className={`mt-3 font-heading text-lg leading-tight transition-colors sm:text-[1.7rem] ${here ? "text-dc-ink" : "text-dc-text-3"}`}>{label}</span>
                </li>
              );
            })}
          </ol>

          {/* Stage control: slider for dragging, stage labels as buttons */}
          <div className="mx-auto mt-10 max-w-3xl">
            <label htmlFor="escrow-tahap" className="sr-only">
              Tahap booking
            </label>
            <input
              id="escrow-tahap"
              type="range"
              min={0}
              max={STAGES.length - 1}
              step={1}
              value={stage}
              onChange={(e) => pick(Number(e.target.value))}
              aria-valuetext={`Tahap ${stage + 1} dari 5: ${s.title}`}
              className="dc-slider"
              style={{ "--progress": `${(stage / (STAGES.length - 1)) * 100}%` } as CSSProperties}
            />
            <div className="mt-2 grid grid-cols-5">
              {STAGES.map((st, i) => (
                <button
                  key={st.status}
                  type="button"
                  onClick={() => pick(i)}
                  aria-pressed={i === stage}
                  className={`min-h-11 rounded-lg px-1 text-center text-xs font-semibold leading-tight transition-colors sm:text-sm ${
                    i === 0 ? "text-left" : i === STAGES.length - 1 ? "text-right" : ""
                  } ${i === stage ? "text-dc-ink" : "text-dc-text-3 hover:text-dc-ink"}`}
                >
                  {st.short}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-2xl text-center" aria-live="polite">
            <motion.div key={stage} initial={changed && !reduced ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
              <h3 className="font-heading text-[clamp(1.8rem,3vw,2.4rem)] leading-tight text-dc-ink">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-dc-text-2">{s.body}</p>
            </motion.div>
            <div className="mt-4 inline-flex rounded-full bg-dc-cream px-4 py-2 text-left">
              <FundStatus status={s.status} compact />
            </div>
          </div>
        </div>

        <Reveal>
          <ul className="dc-stagger mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
            {GUARDS.map((g) => (
              <li key={g.title} className="flex gap-3">
                <svg aria-hidden viewBox="0 0 26 16" fill="none" className="mt-1.5 h-4 w-[26px] shrink-0 text-dc-gold">
                  <circle cx="9" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="17" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <p className="text-sm leading-relaxed text-dc-text-2">
                  <span className="block font-semibold text-dc-ink">{g.title}</span>
                  {g.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center">
            <Link href="/cara-kerja" className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
              Cara kerja lengkap
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
