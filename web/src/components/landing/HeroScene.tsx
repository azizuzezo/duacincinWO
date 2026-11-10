"use client";

// Home hero: the first screen becomes a wedding world. A licensed painting or
// photo of the region (graded warm like a film still), a real floral arch, and
// a real couple in that region's wedding attire, at three depths. The search
// bar is the main door. Every ~7s the world changes (Jawa, Sunda, Minang,
// Internasional), so "vendor untuk setiap adat" is shown, not claimed.
//
// Motion purpose (antislop R-19, ui-ux-pro-max "motion-meaning"): crossfade =
// a new world; ken burns = film still; pointer/scroll parallax across three
// layers = depth. No decorative loops (the old bokeh lights were removed):
// at most the backdrop and the couple move at once. Auto-advance
// stops on hover, while anything inside has focus (typing a search), off
// screen, and never runs under prefers-reduced-motion. A pause button is
// always there (WCAG 2.2.2). Only the first scene loads eagerly; the next one
// is mounted invisibly so the crossfade never shows an empty frame.

import { AnimatePresence, motion, useInView, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { VENDOR_CATEGORIES } from "@/lib/api";
import { EASE, SPRING_SOFT, useReducedMotion } from "@/lib/motion";

import styles from "./hero.module.css";
import { SCENES } from "./scenes";

const STEP_MS = 7000;
const POPULAR = ["venue", "decor", "mua_attire", "photo_video"];

function useDepth(sx: MotionValue<number>, sy: MotionValue<number>, f: number) {
  return { x: useTransform(sx, (v) => v * f), y: useTransform(sy, (v) => v * f) };
}

export function HeroScene() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false);
  const running = playing && !reduced && !hold && inView;
  const scene = SCENES[idx];
  const next = (idx + 1) % SCENES.length;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % SCENES.length);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [running, idx]);

  const pick = useCallback((i: number) => setIdx(((i % SCENES.length) + SCENES.length) % SCENES.length), []);

  // Swipe between worlds on touch screens (horizontal gestures only). The
  // scene chips are the non-gesture alternative.
  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s0 = touch.current;
    touch.current = null;
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x;
    const dy = t.clientY - s0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) pick(idx + (dx < 0 ? 1 : -1));
  }

  // Pointer parallax (mouse only), springs so it settles like a camera.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING_SOFT);
  const sy = useSpring(py, SPRING_SOFT);
  const dBg = useDepth(sx, sy, -12);
  const dArch = useDepth(sx, sy, 14);
  const dCouple = useDepth(sx, sy, -30);
  const coupleRot = useTransform(sx, (v) => v * -1.5);
  function onPointerMove(e: React.PointerEvent) {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  }

  // Scroll parallax: backdrop sinks, couple rises, copy drifts.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 140]);
  const coupleY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -70]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 50]);

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="dc-on-dark relative isolate flex min-h-[max(100svh,760px)] flex-col overflow-hidden bg-dc-ink text-dc-on-dark"
      onPointerMove={onPointerMove}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
        setHold(false);
      }}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false);
      }}
    >
      {/* Layer 1: backdrop worlds (current + next preloaded, crossfading). */}
      <motion.div aria-hidden className="absolute -inset-10 -z-40" style={{ x: dBg.x, y: bgY, translateY: dBg.y }}>
        {SCENES.map((s, i) =>
          i === idx || i === next ? (
            <div key={s.key} className={`absolute inset-0 transition-opacity duration-[1400ms] ease-dc ${i === idx ? "opacity-100" : "opacity-0"}`}>
              <Image
                src={`/scene/${s.bg}-1400.webp`}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className={`object-cover ${i === idx ? "dc-kenburns" : ""}`}
                style={{ objectPosition: s.focus }}
              />
            </div>
          ) : null,
        )}
      </motion.div>
      <div aria-hidden className={`absolute inset-0 -z-30 ${styles.grade}`} />
      <div className="dc-container relative flex flex-1 flex-col pt-28 lg:justify-center lg:pb-10 lg:pt-28">
        <motion.div className={`relative z-10 max-w-[640px] ${styles.copy}`} style={{ y: copyY }}>
          <p className="dc-eyebrow is-light animate-fade-up">Marketplace vendor pernikahan</p>
          <h1 id="hero-title" style={{ animationDelay: "90ms" }} className="animate-fade-up mt-5 font-heading text-[clamp(2.75rem,6vw,5.4rem)] font-medium leading-[0.98] tracking-[-0.02em] text-[#fbf6ec] [text-wrap:balance]">
            Hari bahagia kalian, disiapkan <span className="dc-script-light text-[1.18em]">tanpa was-was</span>.
          </h1>
          <p style={{ animationDelay: "180ms" }} className="animate-fade-up mt-6 max-w-[42ch] text-[1.05rem] leading-[1.75] text-[#fbf6ec]/85 sm:text-lg">
            Cari dan bandingkan vendor terverifikasi, ngobrol dan booking di satu tempat. Pembayaranmu ditahan escrow dan
            baru diteruskan ke vendor setelah acaramu selesai.
          </p>

          {/* The main door: a native GET to /vendors, works without JS. */}
          <form
            action="/vendors"
            method="get"
            role="search"
            aria-label="Cari vendor"
            style={{ animationDelay: "270ms" }}
            className="animate-fade-up mt-9 grid gap-1 rounded-2xl bg-dc-white p-2 text-dc-ink shadow-float sm:grid-cols-[1fr_1.25fr_auto] sm:items-stretch sm:rounded-full"
          >
            <label className="flex flex-col justify-center rounded-xl px-4 py-2 transition-colors focus-within:bg-dc-cream focus-within:ring-2 focus-within:ring-dc-gold hover:bg-dc-cream sm:rounded-full sm:pl-6">
              <span className="text-xs font-semibold text-dc-text-3">Kategori</span>
              <select name="category" defaultValue="" className="-ml-1 min-h-8 cursor-pointer bg-transparent text-[0.95rem] font-semibold text-dc-ink focus:outline-none">
                <option value="">Semua kategori</option>
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col justify-center rounded-xl px-4 py-2 transition-colors focus-within:bg-dc-cream focus-within:ring-2 focus-within:ring-dc-gold hover:bg-dc-cream sm:rounded-full sm:border-l sm:border-dc-line">
              <span className="text-xs font-semibold text-dc-text-3">Kota atau nama vendor</span>
              <input
                name="q"
                type="search"
                placeholder="Contoh: Bandung"
                className="min-h-8 bg-transparent text-[0.95rem] font-semibold text-dc-ink placeholder:font-medium placeholder:text-dc-text-3 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="mt-1 inline-flex min-h-14 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-linear-135 from-[#e2c27f] via-[#c39c52] to-[#a17d36] px-7 text-[0.95rem] font-bold text-[#1a140c] transition-[transform,box-shadow] duration-300 ease-dc hover:shadow-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink motion-safe:hover:-translate-y-0.5 sm:mt-0 sm:rounded-full"
            >
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              Cari vendor
            </button>
          </form>

          <div style={{ animationDelay: "360ms" }} className="animate-fade-up mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            <span className="mr-2 text-[#fbf6ec]/75">Sering dicari:</span>
            {POPULAR.map((v) => (
              <Link
                key={v}
                href={`/vendors?category=${v}`}
                className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-[#fbf6ec] underline decoration-dc-gold-antique/50 underline-offset-[6px] transition-colors hover:text-dc-gold-antique hover:decoration-dc-gold-antique"
              >
                {VENDOR_CATEGORIES.find((c) => c.value === v)?.label}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Layers 2 and 3: floral arch and the couple standing under it.
            Below the copy on small screens, beside it from lg up. */}
        <div aria-hidden className="pointer-events-none relative -mx-4 mt-4 [mask-image:linear-gradient(to_bottom,#000_82%,transparent)] h-[min(92vw,440px)] lg:absolute lg:inset-y-0 lg:left-auto lg:right-0 lg:mx-0 lg:mt-0 lg:h-auto lg:w-[48%]">
          <motion.div className="absolute inset-x-0 bottom-0 flex h-[96%] justify-center lg:h-[84%]" style={dArch}>
            <Image src="/scene/arch1.webp" alt="" width={969} height={900} sizes="(min-width: 1024px) 50vw, 90vw" className="h-full w-auto max-w-none object-contain opacity-90 [filter:brightness(0.82)_saturate(0.9)]" />
          </motion.div>
          <div className={`absolute bottom-0 left-1/2 h-16 w-[70%] -translate-x-1/2 ${styles.floor}`} />
          <motion.div className="absolute inset-x-0 bottom-0 flex h-[78%] justify-center lg:h-[64%]" style={{ x: dCouple.x, y: coupleY, translateY: dCouple.y, rotate: coupleRot }}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={scene.key}
                className="h-full"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduced ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: -10, filter: "blur(6px)", transition: { duration: 0.6, ease: EASE } }}
                transition={{ duration: reduced ? 0.2 : 1.1, ease: EASE }}
              >
                <Image
                  src={`/scene/${scene.couple}.webp`}
                  alt=""
                  width={1200}
                  height={1100}
                  priority={idx === 0}
                  sizes="(min-width: 1024px) 45vw, 80vw"
                  className="h-full w-auto max-w-none object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          {/* Preload the next couple invisibly. */}
          <Image src={`/scene/${SCENES[next].couple}.webp`} alt="" width={1200} height={1100} sizes="(min-width: 1024px) 45vw, 80vw" className="invisible absolute h-px w-px" />
        </div>
      </div>

      {/* Scene picker, caption and credit. */}
      <div className="relative z-10 pb-5">
        <div className="dc-container flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div role="group" aria-label="Pilih adat" className="-my-1 flex min-w-0 gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
              {SCENES.map((s, i) => {
                const on = i === idx;
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(i)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                      on ? "border-[#fbf6ec] bg-[#fbf6ec] text-dc-ink" : "border-[#fbf6ec]/30 bg-dc-ink/40 text-[#fbf6ec]/90 hover:border-[#fbf6ec]/70 hover:text-white"
                    }`}
                  >
                    {on && (
                      <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 -rotate-90 ${styles.ring}`}>
                        <circle cx="10" cy="10" r="8" className={styles.ringBg} />
                        <circle
                          key={`${s.key}-${running}`}
                          cx="10"
                          cy="10"
                          r="8"
                          className={`${styles.ringFg} ${running ? styles.ringRun : ""}`}
                          style={{ animationDuration: `${STEP_MS}ms` }}
                        />
                      </svg>
                    )}
                    {s.label}
                  </button>
                );
              })}
            </div>
            <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-pressed={!playing}
                aria-label={playing ? "Jeda pergantian adat" : "Putar pergantian adat"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#fbf6ec]/30 bg-dc-ink/40 text-[#fbf6ec] transition-colors hover:border-[#fbf6ec]/70 motion-reduce:hidden"
              >
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l10.5-6.5z" />}
                </svg>
              </button>
          </div>
          <p className="self-start rounded-md text-xs leading-relaxed text-[#fbf6ec]/85 max-lg:bg-dc-ink/75 max-lg:px-2.5 max-lg:py-1.5 lg:self-auto" aria-live={running ? "off" : "polite"}>
            <span className="font-semibold text-[#fbf6ec]">{scene.caption}</span>
            <span aria-hidden> · </span>
            {scene.credit.kind}:{" "}
            <a href={scene.credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
              {scene.credit.title}
            </a>
            , {scene.credit.author} (
            {scene.credit.licenseUrl ? (
              <a href={scene.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                {scene.credit.license}
              </a>
            ) : (
              scene.credit.license
            )}
            )
          </p>
        </div>
      </div>
    </section>
  );
}
