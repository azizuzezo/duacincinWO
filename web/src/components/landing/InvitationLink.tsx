"use client";

// DuaCincin Undangan as a cinematic chapter: a fan of REAL invitation phones
// (the invitation site's own theme previews, public/showcase/undangan) over
// the painting of the chosen world. Flip through by tapping a side phone, the
// arrows, arrow keys or a swipe; the theme chips do the same. The three chips
// are exactly what the WO handoff carries over (bride and groom, event date
// and venue, guest list), nothing more is promised. Invitation packages are
// chosen and paid on the invitation site, so the copy says so.
//
// Motion purpose: the fan turns like cards in a hand (spring, the chosen phone
// comes to the front); the painting crossfades to the theme's world; the fan
// drifts up a little on scroll (depth against the backdrop). Reduced motion:
// the fan re-orders without travel, no drift.
import { AnimatePresence, motion, useScroll, useTransform, type PanInfo } from "framer-motion";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { WORLD_LIST } from "@/components/landing/scenes";
import { ButtonLink } from "@/components/ui/Button";
import { EASE, useReducedMotion } from "@/lib/motion";

// scene: index into WORLD_LIST (backdrop behind the fan; the nearest world).
const THEMES = [
  { key: "java", label: "Jawa", scene: 0 },
  { key: "sunda", label: "Sunda", scene: 1 },
  { key: "minang", label: "Minang", scene: 2 },
  { key: "bali", label: "Bali", scene: 0 },
  { key: "islamic", label: "Islami", scene: 1 },
  { key: "chinese", label: "Tionghoa", scene: 2 },
  { key: "gardenparty", label: "Garden party", scene: 3 },
  { key: "royal", label: "Royal", scene: 3 },
];

const CARRIED = ["Nama kalian", "Tanggal dan tempat", "Daftar tamu"];

function wrap(d: number, n: number) {
  const h = Math.floor(n / 2);
  return ((((d + h) % n) + n) % n) - h;
}

export function InvitationLink() {
  const reduced = useReducedMotion();
  const [theme, setTheme] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -50]);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const t = THEMES[theme];
  const scene = WORLD_LIST[t.scene];
  const go = (n: number) => setTheme((n + THEMES.length) % THEMES.length);

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (theme + d + THEMES.length) % THEMES.length;
    go(n);
    btns.current[n]?.focus();
  }

  function onSwipe(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 50) go(theme + (info.offset.x < 0 ? 1 : -1));
  }

  return (
    <section aria-labelledby="undangan-judul" className="dc-on-dark relative isolate overflow-hidden bg-dc-ink text-dc-on-dark">
      {/* World behind the fan */}
      <AnimatePresence initial={false}>
        <motion.div
          key={scene.key}
          className="absolute inset-0 -z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 1.2, ease: EASE }}
        >
          <Image src={`${scene.bg}-1400.webp`} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: scene.focus }} />
        </motion.div>
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_60%,rgba(21,17,13,0.55),rgba(21,17,13,0.9)_70%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[55%] bg-linear-to-b from-dc-ink/90 to-transparent" />

      <div className="dc-container py-20 text-center sm:py-28 lg:py-32">
        <Reveal>
          <p className="dc-eyebrow justify-center">DuaCincin Undangan</p>
          <h2 id="undangan-judul" className="mx-auto mt-4 max-w-4xl font-heading text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.98]">
            Undangannya <span className="dc-script-light text-[1.12em]">terisi sendiri</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg leading-relaxed text-dc-on-dark/90">Dari rencana kalian di DuaCincin, tanpa mengetik ulang.</p>
          <ul className="dc-stagger mt-6 flex flex-wrap justify-center gap-2">
            {CARRIED.map((c) => (
              <li key={c} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dc-gold-antique/45 bg-dc-ink/70 px-4 text-sm font-semibold">
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-dc-gold-antique">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                {c}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* The fan */}
        <motion.div ref={stage} style={{ y: lift }} className="relative mx-auto mt-16 h-[540px] max-w-5xl sm:h-[640px] lg:h-[760px]">
          <motion.div
            className="absolute inset-0 touch-pan-y"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={onSwipe}
          >
            {THEMES.map((th, i) => {
              const d = wrap(i - theme, THEMES.length);
              const ad = Math.abs(d);
              const visible = ad <= 2;
              return (
                <motion.button
                  key={th.key}
                  type="button"
                  tabIndex={-1}
                  aria-hidden={d !== 0}
                  onClick={() => go(i)}
                  initial={false}
                  animate={{
                    x: `${d * 62}%`,
                    y: `${ad * 7}%`,
                    rotate: d * 7,
                    scale: 1 - ad * 0.12,
                    opacity: visible ? (ad === 2 ? 0.55 : 1) : 0,
                  }}
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 22 }}
                  style={{ zIndex: 10 - ad, pointerEvents: visible ? "auto" : "none" }}
                  className="absolute left-1/2 top-0 -ml-[105px] w-[210px] origin-bottom sm:-ml-[125px] sm:w-[250px] lg:-ml-[150px] lg:w-[300px]"
                >
                  <span className="block rounded-[2.6rem] bg-[#0b0907] p-[3.2%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-dc-gold-antique/35">
                    <span className="relative block aspect-[780/1690] overflow-hidden rounded-[2.2rem] bg-dc-ink-2">
                      <Image
                        src={`/showcase/undangan/preview-v2-${th.key}.webp`}
                        alt={d === 0 ? `Contoh undangan digital DuaCincin bertema ${th.label}` : ""}
                        fill
                        draggable={false}
                        sizes="(min-width: 1024px) 300px, 250px"
                        className="object-cover object-top"
                      />
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => go(theme - 1)}
            aria-label="Tema sebelumnya"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-dc-on-dark/30 transition-[background-color,color,transform] duration-300 hover:bg-dc-on-dark hover:text-dc-ink active:scale-90"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="rotate-180">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <p className="min-w-40 font-heading text-3xl" aria-live="polite">
            {t.label}
          </p>
          <button
            type="button"
            onClick={() => go(theme + 1)}
            aria-label="Tema berikutnya"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-dc-on-dark/30 transition-[background-color,color,transform] duration-300 hover:bg-dc-on-dark hover:text-dc-ink active:scale-90"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div role="radiogroup" aria-label="Tema undangan" className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {THEMES.map((th, i) => {
            const on = i === theme;
            return (
              <button
                key={th.key}
                ref={(el) => {
                  btns.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => go(i)}
                onKeyDown={onKey}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-300 active:scale-95 ${
                  on ? "border-dc-gold-antique bg-dc-gold-antique text-dc-ink" : "border-dc-on-dark/25 bg-dc-ink/60 text-dc-on-dark hover:border-dc-gold-antique/70"
                }`}
              >
                {th.label}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <ButtonLink href="/client/undangan" variant="gold" size="lg">
            Buat undangan digital
          </ButtonLink>
          <p className="text-sm text-dc-on-dark/85">Paket undangan dipilih dan dibayar di DuaCincin Undangan.</p>
          <p className="mt-6 text-xs text-dc-on-dark/75">
            Latar: {scene.credit.title}, {scene.credit.author} ({scene.credit.license})
          </p>
        </div>
      </div>
    </section>
  );
}
