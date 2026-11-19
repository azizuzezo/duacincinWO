"use client";

// Kirana on the landing: the door to the assistant. Kirana in real 3D beside
// frosted glass over a warm, blurred wedding photo; a composer and example
// questions. Asking takes the visitor to /kirana (her own full-screen page,
// same tab) where the question runs at once; a visitor with an earlier
// conversation gets "Lanjutkan percakapan". Server: internal/aiassist.
//
// Motion purpose: Kirana waves when the section is first seen, listens
// (leans toward the field) while the visitor types, and thinks as the
// question is sent; the background light follows the pointer. Nothing loops
// while idle. Reduced motion: still Kirana, no light.
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

import { Composer, EXAMPLES, ExampleIcon, type ComposerApi } from "./Composer";
import { Kirana3D, KiranaFace } from "./Kirana3D";
import { KiranaLauncher } from "./KiranaLauncher";
import type { Kirana3DMood } from "./KiranaScene";
import { useAsk } from "./useAsk";

export function AskAI() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const { turns, profile } = useAsk();
  const input = useRef<HTMLTextAreaElement>(null);
  const composerApi = useRef<ComposerApi | null>(null);
  const section = useRef<HTMLElement>(null);
  const [typing, setTyping] = useState(false);
  const [greet, setGreet] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const asked = turns.filter((t) => t.role === "user").length;

  const mood: Kirana3DMood = leaving ? "thinking" : typing ? "listening" : greet ? "wave" : "idle";

  useEffect(() => {
    router.prefetch("/kirana");
  }, [router]);

  // Wave hello the first time the section is seen.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setGreet(true);
        t = setTimeout(() => setGreet(false), 3200);
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  // "Tanya Kirana" links aimed at #tanya land on the composer, ready to type.
  useEffect(() => {
    const go = () => setTimeout(() => input.current?.focus({ preventScroll: true }), 450);
    const onHash = () => window.location.hash === "#tanya" && go();
    onHash();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("kirana:open", go);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("kirana:open", go);
    };
  }, []);

  const ask = useCallback(
    (text: string) => {
      setLeaving(true);
      router.push(`/kirana?q=${encodeURIComponent(text.trim().slice(0, 1000))}`);
    },
    [router],
  );

  // Background light follows the pointer across the section.
  const lx = useMotionValue(0.72);
  const ly = useMotionValue(0.35);
  const sx = useSpring(lx, { stiffness: 40, damping: 16 });
  const sy = useSpring(ly, { stiffness: 40, damping: 16 });
  const px = useMotionTemplate`calc(${sx} * 100%)`;
  const py = useMotionTemplate`calc(${sy} * 100%)`;
  const light = useMotionTemplate`radial-gradient(560px circle at ${px} ${py}, rgb(220 187 118 / 0.45), transparent 65%)`;
  function onSectionMove(e: PointerEvent<HTMLElement>) {
    if (reduced || e.pointerType !== "mouse" || !section.current) return;
    const r = section.current.getBoundingClientRect();
    lx.set((e.clientX - r.left) / r.width);
    ly.set((e.clientY - r.top) / r.height);
  }

  return (
    <>
      <KiranaLauncher name={profile?.name} />
      <section ref={section} id="tanya" aria-labelledby="tanya-judul" onPointerMove={onSectionMove} className="relative isolate scroll-mt-20 overflow-hidden bg-dc-ivory py-16 sm:py-24 lg:py-28">
        {/* The scene behind the glass: a real wedding photo, softened and warm. */}
        <div aria-hidden className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative, heavily blurred backdrop */}
          <img src="/photos/pinterest/pelaminan-kristal-sm.webp" alt="" className="h-full w-full scale-110 object-cover opacity-75 blur-2xl" />
          <div className="absolute inset-0 bg-linear-to-b from-dc-ivory/80 via-dc-ivory/45 to-dc-ivory/85" />
          <motion.div className="absolute inset-0" style={{ background: light }} />
          <div className="dc-aurora is-a left-[-10%] top-[5%] h-[460px] w-[460px] bg-[#f3d2b8]/60" />
          <div className="dc-aurora is-b bottom-[-10%] right-[-5%] h-[520px] w-[520px] bg-[#e8cb8c]/45" />
        </div>

        <div className="dc-container relative grid items-center gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          {/* Kirana, big and live */}
          <div className="relative mx-auto h-[220px] w-[200px] sm:h-[290px] sm:w-[270px] lg:mx-0 lg:h-[520px] lg:w-full">
            <Kirana3D mood={mood} className="h-full w-full" />
            <AnimatePresence>
              {(greet || typing || leaving) && (
                <motion.p
                  key={leaving ? "leaving" : typing ? "typing" : "greet"}
                  aria-hidden
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="dc-glass absolute -right-8 top-4 whitespace-nowrap rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm font-semibold text-dc-ink sm:-right-16 lg:right-[8%] lg:top-[12%]"
                >
                  {leaving ? "Siap, aku carikan!" : typing ? "Aku dengarkan…" : profile ? `Halo lagi, Kak ${profile.name}!` : "Hai, aku Kirana!"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div data-kirana-zone className="w-full">
            <div className="mb-7 text-center lg:mb-8 lg:text-left">
              <p className="dc-eyebrow justify-center lg:justify-start">Kenalan dengan Kirana, asisten AI DuaCincin</p>
              <h2 id="tanya-judul" className="mt-4 font-heading text-[clamp(2.3rem,4.4vw,3.9rem)] leading-[1.02] text-dc-ink [text-wrap:balance]">
                Ceritakan rencanamu, <span className="dc-em">Kirana bantu susun.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-[52ch] text-[1.02rem] leading-[1.75] text-dc-text-2 lg:mx-0">
                Budget, vendor di kotamu, ide konsep, sampai urutan persiapan. Rekomendasinya hanya dari vendor yang terdaftar di DuaCincin.
              </p>
              <ul className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-dc-ink lg:justify-start">
                {["Vendor terverifikasi saja", "Riwayat tersimpan tanpa daftar", "Gratis"].map((b) => (
                  <li key={b} className="dc-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-dc-clay">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <Composer big busy={leaving} onSend={ask} onStop={() => {}} onTyping={setTyping} inputRef={input} apiRef={composerApi} />

            {asked > 0 && (
              <Link
                href="/kirana"
                className="dc-glass mt-4 flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-semibold text-dc-ink transition-[transform,border-color] duration-300 ease-dc hover:border-dc-gold/70 motion-safe:hover:-translate-y-0.5"
              >
                <KiranaFace size={36} mood="happy" />
                <span className="flex-1">Lanjutkan percakapan ({asked} pertanyaan)</span>
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            )}

            <motion.ul
              className="mt-5 grid gap-2.5 sm:grid-cols-2"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
            >
              {EXAMPLES.map((ex) => (
                <motion.li
                  key={ex.text}
                  variants={
                    reduced
                      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                      : { hidden: { opacity: 0, y: 14, filter: "blur(4px)" }, visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE } } }
                  }
                >
                  <button
                    type="button"
                    disabled={leaving}
                    onClick={() => composerApi.current?.fill(ex.text)}
                    className="dc-glass group flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[0.95rem] font-semibold text-dc-ink transition-[transform,box-shadow,border-color] duration-300 ease-dc hover:border-dc-gold/70 hover:shadow-lift active:scale-[0.99] disabled:opacity-60 motion-safe:hover:-translate-y-1"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dc-white/80 transition-colors duration-300 group-hover:bg-dc-gold-soft">
                      <ExampleIcon kind={ex.icon} />
                    </span>
                    <span className="min-w-0 flex-1">{ex.text}</span>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </section>
    </>
  );
}
