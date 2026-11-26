"use client";

// "Perjalanan uangmu": the seven real booking stages (PRD §8.11), one at a
// time. Three little stations with faces (you, Dana Aman, the vendor) and a
// gold coin with a face that hops to the station where your money is at the
// chosen stage. Pick a stage with the numbered dots, Prev/Next or the arrow
// keys; the real app screen of that stage shows in the phone beside it.
// Links like #tahap-4 (the header chips) open that stage.
//
// Motion purpose: the coin travels only when the money really moves, and the
// phone screen swaps with the stage (the story is the product). Reduced
// motion: the coin jumps, screens cross-fade only.
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { ArrowRight, wdButton } from "@/components/home/ui";
import { PHONE_FRAME_RATIO, PhoneFrame } from "@/components/ui/DeviceFrame";
import { FundStatus } from "@/components/ui/FundStatus";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

type Station = 0 | 1 | 2;

export type Stage = {
  station: Station;
  /** Booking status the client sees in the app at this stage (null = no booking yet). */
  status: BookingStatus | null;
  title: string;
  body: string;
  /** Where this happens in DuaCincin. */
  where: string;
  /** Real screen of this stage (web/public/showcase/pages). */
  screen: { src: string; alt: string };
};

const INK = "#231f1d";
const GOLD = "#dcbd80";
const SOFT = "#f5ecd9";

const STATIONS: { label: string; sub: string; art: ReactNode }[] = [
  {
    label: "Masih di kamu",
    sub: "Belum ada dana berpindah",
    art: (
      <>
        <rect x="8" y="18" width="48" height="36" rx="9" fill={SOFT} stroke={INK} strokeWidth="2.4" />
        <path d="M8 27h48" stroke={INK} strokeWidth="2.4" />
        <rect x="40" y="34" width="16" height="12" rx="6" fill={GOLD} stroke={INK} strokeWidth="2.4" />
        <circle cx="46" cy="40" r="1.8" fill={INK} />
        <circle cx="21" cy="38" r="2" fill={INK} />
        <circle cx="30" cy="38" r="2" fill={INK} />
        <path d="M21 44c1.2 1.8 2.6 2.4 4.5 2.4s3.3-.6 4.5-2.4" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Ditahan DuaCincin",
    sub: "Vendor belum menerima",
    art: (
      <>
        <path d="M32 6 10 14v15c0 13 9 23 22 28 13-5 22-15 22-28V14L32 6Z" fill={GOLD} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <circle cx="24" cy="29" r="2.2" fill={INK} />
        <circle cx="40" cy="29" r="2.2" fill={INK} />
        <path d="M25 37c2 2.4 4.2 3.4 7 3.4s5-1 7-3.4" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="20" cy="35" r="2.6" fill="#fff" opacity=".55" />
        <circle cx="44" cy="35" r="2.6" fill="#fff" opacity=".55" />
      </>
    ),
  },
  {
    label: "Diteruskan ke vendor",
    sub: "Setelah kamu konfirmasi",
    art: (
      <>
        <path d="M8 24h48l-4-14H12L8 24Z" fill={GOLD} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M20 24v3a4 4 0 0 1-8 0v-3M36 24v3a4 4 0 0 1-8 0v-3M52 24v3a4 4 0 0 1-8 0v-3" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <rect x="12" y="30" width="40" height="24" rx="3" fill={SOFT} stroke={INK} strokeWidth="2.4" />
        <circle cx="24" cy="40" r="2" fill={INK} />
        <circle cx="40" cy="40" r="2" fill={INK} />
        <path d="M26 46c1.6 1.8 3.4 2.4 6 2.4s4.4-.6 6-2.4" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
];

/** The coin with a face; it hops between stations. */
function Coin() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className="h-full w-full drop-shadow-[0_4px_6px_rgba(138,104,43,0.45)]">
      <circle cx="20" cy="20" r="17" fill="url(#coin-g)" stroke={INK} strokeWidth="2" />
      <defs>
        <radialGradient id="coin-g" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#f6e3ad" />
          <stop offset="0.6" stopColor="#d4ac5e" />
          <stop offset="1" stopColor="#a47c35" />
        </radialGradient>
      </defs>
      <circle cx="14.5" cy="18" r="2" fill={INK} />
      <circle cx="25.5" cy="18" r="2" fill={INK} />
      <path d="M14.5 24c1.4 2.2 3.1 3 5.5 3s4.1-.8 5.5-3" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="11" cy="23" r="2.2" fill="#fff" opacity=".5" />
      <circle cx="29" cy="23" r="2.2" fill="#fff" opacity=".5" />
    </svg>
  );
}

export function MoneyJourney({ stages }: { stages: Stage[] }) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const stage = stages[index];
  const last = stages.length - 1;

  const go = useCallback(
    (i: number, focus = false) => {
      const n = Math.min(last, Math.max(0, i));
      setIndex(n);
      if (focus) dots.current[n]?.focus();
    },
    [last],
  );

  // #tahap-N (from the header chips) opens that stage.
  useEffect(() => {
    const read = () => {
      const m = window.location.hash.match(/^#tahap-(\d+)$/);
      if (m) setIndex(Math.min(last, Math.max(0, Number(m[1]) - 1)));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [last]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(index + 1, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(index - 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      go(last, true);
    }
  };

  return (
    <section aria-labelledby="perjalanan-judul" className="relative bg-white py-12 sm:py-16">
      {[1, 4, 7].map((n) => (
        <span key={n} id={`tahap-${n}`} aria-hidden className="absolute -top-28 left-0 h-px w-px" />
      ))}
      <div className="wd-container">
        <Reveal>
          <h2 id="perjalanan-judul" className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
            Perjalanan uangmu, <em>tahap demi tahap</em>
          </h2>
          <p className="mt-1.5 text-[0.95rem] text-wd-muted">Pilih tahapnya. Koin emas akan menunjukkan di mana uangmu berada.</p>
        </Reveal>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14" onKeyDown={onKey}>
          <div>
            {/* The track: three stations and the coin that hops between them. */}
            <div className="relative mx-auto max-w-[560px] pt-14">
              <div aria-hidden className="absolute left-[12%] right-[12%] top-[88px] h-0 border-t-[3px] border-dashed border-wd-accent-line" />
              <motion.div
                aria-hidden
                className="absolute top-0 z-10 h-11 w-11 -translate-x-1/2"
                initial={false}
                animate={{ left: `${12 + stage.station * 38}%`, y: reduced ? 0 : [0, -26, 0] }}
                transition={{ left: { type: "spring", stiffness: 140, damping: 16 }, y: { duration: 0.6, ease: EASE } }}
              >
                <Coin />
              </motion.div>
              <ol className="relative grid grid-cols-3">
                {STATIONS.map((s, i) => {
                  const here = i === stage.station;
                  return (
                    <li key={s.label} aria-current={here ? "step" : undefined} className="flex flex-col items-center text-center">
                      <span
                        className={`h-[84px] w-[84px] rounded-[26px] p-3 transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${
                          here ? "scale-110 bg-wd-accent-soft shadow-wd-lift ring-2 ring-wd-accent" : "bg-wd-paper ring-1 ring-wd-line"
                        }`}
                      >
                        <svg viewBox="0 0 64 64" aria-hidden className="h-full w-full">
                          {s.art}
                        </svg>
                      </span>
                      <span className={`mt-3 text-[0.95rem] font-semibold leading-tight transition-colors ${here ? "text-wd-ink" : "text-wd-muted"}`}>{s.label}</span>
                      <span className="mt-0.5 max-w-[16ch] text-xs leading-snug text-wd-muted">{s.sub}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Stage picker */}
            <nav aria-label="Tahap pemesanan" className="mt-8">
              <ol className="relative flex items-center justify-between gap-1">
                <span aria-hidden className="absolute left-5 right-5 top-1/2 -z-0 h-0.5 -translate-y-1/2 bg-wd-line" />
                <motion.span aria-hidden className="absolute left-5 top-1/2 z-0 h-0.5 -translate-y-1/2 bg-wd-accent" initial={false} animate={{ width: `calc((100% - 2.5rem) * ${index / last})` }} transition={{ duration: reduced ? 0 : 0.4, ease: EASE }} />
                {stages.map((_, i) => {
                  const on = i === index;
                  const done = i < index;
                  return (
                    <li key={i} className="relative z-10">
                      <button
                        ref={(el) => {
                          dots.current[i] = el;
                        }}
                        type="button"
                        onClick={() => go(i)}
                        aria-current={on ? "step" : undefined}
                        aria-label={`Tahap ${i + 1}: ${stages[i].title}`}
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-[background-color,transform,box-shadow,color] duration-300 ${
                          on ? "scale-110 bg-wd-accent text-wd-ink shadow-wd-card" : done ? "bg-wd-accent-soft text-wd-accent-ink hover:bg-wd-accent/40" : "border border-wd-line-2 bg-white text-wd-muted hover:border-wd-ink hover:text-wd-ink"
                        }`}
                      >
                        {i + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* The chosen stage */}
            <div className="mt-6 rounded-[24px] bg-wd-accent-wash p-6 ring-1 ring-wd-accent-soft sm:p-7" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={index}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <p className="text-sm font-semibold text-wd-accent-ink">
                    Tahap {index + 1} dari {stages.length}
                  </p>
                  <h3 className="wd-title mt-1 text-[1.4rem] leading-snug">{stage.title}</h3>
                  <p className="mt-2 max-w-[52ch] leading-relaxed text-wd-text">{stage.body}</p>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-wd-ink ring-1 ring-wd-line">
                    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-wd-accent-ink">
                      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
                      <circle cx="12" cy="10" r="2.4" />
                    </svg>
                    {stage.where}
                  </p>
                  <div className="mt-4 border-t border-wd-accent-soft pt-4">
                    {stage.status ? (
                      <>
                        <p className="mb-2 text-sm font-semibold text-wd-ink">Booking: {BOOKING_STATUS_LABEL[stage.status]}</p>
                        <FundStatus status={stage.status} compact />
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed text-wd-text">Belum ada booking. Kamu masih memilih dan berdiskusi.</p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={wdButton({ variant: "outline", size: "sm" })}>
                  <ArrowRight size={14} className="rotate-180" />
                  Sebelumnya
                </button>
                <button type="button" onClick={() => go(index + 1)} disabled={index === last} className={wdButton({ size: "sm" })}>
                  Berikutnya
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* The real screen of this stage */}
          <div className="relative mx-auto w-[min(72%,270px)] lg:w-[270px]">
            <div aria-hidden className="absolute -inset-x-10 -inset-y-8 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,#f5ecd9,transparent)]" />
            <div className="relative" style={{ aspectRatio: PHONE_FRAME_RATIO }}>
              <AnimatePresence initial={false}>
                <motion.div
                  key={stage.screen.src}
                  className="absolute inset-0"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: reduced ? 0.2 : 0.5, ease: EASE }}
                >
                  <PhoneFrame src={stage.screen.src} alt={stage.screen.alt} sizes="270px" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
