"use client";

// The seven real booking stages (PRD §8.11) told as one scroll. Left (desktop)
// stays pinned: three money stations with one gold coin, the booking status
// the client sees in the app, and a stage rail. Right: the stages. As a stage
// reaches the middle of the screen it becomes active and the coin moves to
// where the money is at that stage. On phones the pinned panel becomes a slim
// sticky bar under the navbar.
//
// Motion purpose: the coin is the message (it stays in escrow until the event
// is done); the gold line fills with the reader's progress. Reduced motion:
// the coin jumps, the line is static.

import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { FundStatus } from "@/components/ui/FundStatus";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/api";
import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

type Station = 0 | 1 | 2;

export type Stage = {
  station: Station;
  /** Booking status the client sees in the app at this stage (null = no booking yet). */
  status: BookingStatus | null;
  title: string;
  body: string;
  /** Where this happens in DuaCincin. */
  where: string;
};

const STATIONS = [
  { label: "Masih di kamu", sub: "Belum ada dana yang berpindah" },
  { label: "Ditahan escrow", sub: "Di akun penampung DuaCincin, vendor belum menerima" },
  { label: "Diteruskan ke vendor", sub: "Setelah kamu konfirmasi acara selesai" },
];

const CHAPTER = ["Sebelum bayar", "Dana ditahan", "Setelah hari-H"];

function Coin({ id, reduced, small = false }: { id: string; reduced: boolean; small?: boolean }) {
  return (
    <motion.span
      layoutId={reduced ? undefined : id}
      transition={SPRING_SNAPPY}
      aria-hidden
      className={`${small ? "h-3.5 w-3.5" : "h-5 w-5"} rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3dc9f,#c39c52_55%,#8a682b)] shadow-gold`}
    />
  );
}

function Vault({ stage, index, total, onJump, reduced }: { stage: Stage; index: number; total: number; onJump: (i: number) => void; reduced: boolean }) {
  return (
    <div className="rounded-2xl border border-dc-line bg-dc-white p-6 shadow-soft xl:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-dc-text-2">Posisi uangmu</p>
        <p className="text-sm text-dc-text-3">
          Tahap <span className="font-semibold text-dc-ink">{index + 1}</span> dari {total}
        </p>
      </div>
      <ol className="relative mt-5 flex flex-col gap-5">
        <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-px bg-[repeating-linear-gradient(180deg,var(--dc-line-strong)_0_6px,transparent_6px_12px)]" />
        {STATIONS.map((s, i) => {
          const here = i === stage.station;
          return (
            <li key={s.label} className="relative flex items-center gap-4" aria-current={here ? "step" : undefined}>
              <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${here ? "border-dc-gold bg-dc-cream" : "border-dc-line-strong bg-dc-white"}`}>
                {here && <Coin id="journey-coin" reduced={reduced} />}
              </span>
              <span>
                <span className={`block font-heading text-[1.45rem] leading-tight transition-colors ${here ? "text-dc-ink" : "text-dc-text-3"}`}>{s.label}</span>
                <span className="block text-sm text-dc-text-3">{s.sub}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 border-t border-dc-line pt-5">
        <p className="text-xs font-semibold text-dc-text-3">Yang kamu lihat di aplikasi</p>
        <div className="mt-2 min-h-[3.75rem]">
          {stage.status ? (
            <>
              <p className="mb-2 text-sm font-semibold text-dc-ink">Booking: {BOOKING_STATUS_LABEL[stage.status]}</p>
              <FundStatus status={stage.status} compact />
            </>
          ) : (
            <p className="text-sm leading-relaxed text-dc-text-2">Belum ada booking. Kamu masih memilih dan berdiskusi.</p>
          )}
        </div>
      </div>
      <nav aria-label="Lompat ke tahap" className="mt-5 flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Lompat ke tahap ${i + 1}`}
            aria-current={i === index ? "step" : undefined}
            className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors duration-300 ${
              i === index
                ? "border-dc-ink bg-dc-ink text-dc-on-dark"
                : i < index
                  ? "border-dc-gold/60 bg-dc-cream text-dc-clay hover:border-dc-ink"
                  : "border-dc-line-strong text-dc-text-3 hover:border-dc-ink hover:text-dc-ink"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function JourneyStory({ stages }: { stages: Stage[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const listRef = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 60%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  function jump(i: number) {
    const el = refs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
    setActive(i);
  }

  const stage = stages[active];

  return (
    <section aria-labelledby="tahap-judul" className="relative bg-dc-ivory">
      {/* Phone: where the money is rides along under the navbar. */}
      <div className="sticky top-[72px] z-30 border-b border-dc-line bg-dc-ivory/95 backdrop-blur-sm lg:hidden">
        <div className="dc-container flex min-h-14 items-center justify-between gap-3 py-2">
          <p className="text-sm text-dc-text-2">
            Tahap <span className="font-semibold text-dc-ink">{active + 1}</span>/{stages.length}
          </p>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5" aria-hidden>
              {[0, 1, 2].map((s) => (
                <span key={s} className={`flex h-6 w-6 items-center justify-center rounded-full border ${s === stage.station ? "border-dc-gold bg-dc-cream" : "border-dc-line-strong"}`}>
                  {s === stage.station && <Coin id="journey-coin-m" reduced={reduced} small />}
                </span>
              ))}
            </span>
            <span className="text-sm font-semibold text-dc-ink">{STATIONS[stage.station].label}</span>
          </div>
        </div>
      </div>

      <div className="dc-container grid gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="dc-eyebrow">Tujuh tahap pemesanan</p>
            <h2 id="tahap-judul" className="mt-4 font-heading text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.02] text-dc-ink">
              Ikuti koin emasnya, <span className="dc-em">di situlah uangmu.</span>
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-dc-text-2">
              Setiap tahap tercatat di DuaCincin. Uangmu tidak sampai ke rekening vendor sebelum kamu sendiri menyatakan acaranya selesai.
            </p>
            <div className="mt-8 hidden lg:block">
              <Vault stage={stage} index={active} total={stages.length} onJump={jump} reduced={reduced} />
            </div>
          </div>
        </div>

        <ol ref={listRef} className="relative lg:col-span-7">
          <span aria-hidden className="absolute bottom-0 left-[1.35rem] top-0 hidden w-px bg-dc-line-strong sm:block" />
          {!reduced && <motion.span aria-hidden style={{ scaleY: fill }} className="absolute bottom-0 left-[1.35rem] top-0 hidden w-px origin-top bg-dc-gold sm:block" />}
          {stages.map((s, i) => {
            const on = i === active;
            const firstOfChapter = i === 0 || stages[i - 1].station !== s.station;
            return (
              <li key={s.title} className="relative">
                {firstOfChapter && (
                  <p className={`relative font-heading text-2xl italic text-dc-clay sm:pl-16 ${i === 0 ? "" : "pt-10"}`}>{CHAPTER[s.station]}</p>
                )}
                <article
                  id={`tahap-${i + 1}`}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  data-i={i}
                  tabIndex={-1}
                  aria-labelledby={`tahap-${i + 1}-judul`}
                  className="relative grid scroll-mt-40 gap-4 py-6 outline-none sm:grid-cols-[2.75rem_1fr] sm:gap-5 lg:py-8"
                >
                  <span
                    aria-hidden
                    className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border font-heading text-xl tabular-nums transition-colors duration-500 ${
                      on ? "border-dc-gold bg-dc-ink text-dc-gold-antique" : i < active ? "border-dc-gold bg-dc-cream text-dc-clay" : "border-dc-line-strong bg-dc-ivory text-dc-text-3"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className={`rounded-xl border p-5 transition-[background-color,border-color,box-shadow] duration-500 sm:p-7 ${on ? "border-dc-line bg-dc-white shadow-lift" : "border-dc-line/60 bg-dc-white/40"}`}>
                    <h3 id={`tahap-${i + 1}-judul`} className="font-heading text-[clamp(1.7rem,3vw,2.2rem)] leading-tight text-dc-ink">
                      <span className="sr-only">Tahap {i + 1}: </span>
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-xl leading-relaxed text-dc-text-2">{s.body}</p>
                    <div className="mt-5 flex flex-col gap-3 border-t border-dc-line pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      {s.status ? (
                        <FundStatus status={s.status} compact />
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1.5 flex shrink-0 items-center gap-1" aria-hidden>
                            {[0, 1, 2].map((d) => (
                              <span key={d} className="h-2 w-2 rounded-full border border-dc-line-strong" />
                            ))}
                          </span>
                          <p className="text-sm font-semibold text-dc-ink">Belum ada pembayaran</p>
                        </div>
                      )}
                      <p className="text-sm text-dc-text-3 sm:max-w-[17rem] sm:text-right">{s.where}</p>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
