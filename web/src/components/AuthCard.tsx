"use client";

// Auth layout (login, register, forgot password). Same language as the home
// hero and the invitation site's auth pages: the left panel is a wedding
// world (licensed painting or photo, gold arch, real couple in adat attire) at
// three depths with pointer parallax, changing every ~7s. It stops while the
// form has focus (never distracts typing), on hover, when the tab is hidden,
// and never moves under reduced motion. The form side is calm ivory paper.

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { SCENES } from "@/components/landing/scenes";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { EASE, SPRING_SOFT, useReducedMotion } from "@/lib/motion";
import { GoldArchFrame } from "@/components/ornament/GoldArch";

type Variant = "client" | "vendor" | "internal" | "unified" | "register";

const SIDE_CONTENT: Record<Variant, { headline: string; script: string; bullets: string[] }> = {
  client: {
    headline: "Rencanakan pernikahan",
    script: "tanpa drama",
    bullets: ["Direktori vendor terverifikasi", "Budget planner dan wedding planner", "Pembayaran ditahan escrow sampai acara selesai"],
  },
  vendor: {
    headline: "Fokus pada karyamu,",
    script: "booking kami bantu",
    bullets: ["Booking dan pembayaran tercatat di satu tempat", "Komisi jelas, dana cair setelah acara selesai", "Semua diskusi dengan client tersimpan"],
  },
  internal: {
    headline: "Panel internal",
    script: "tim DuaCincin",
    bullets: ["Verifikasi dan moderasi vendor", "Sengketa dan pencairan dana", "Konsultasi client"],
  },
  // Register before a role is chosen.
  register: {
    headline: "Mulai rencanakan",
    script: "hari bahagia",
    bullets: ["Satu akun untuk vendor, budget, dan planner", "Vendor diverifikasi sebelum tampil", "Pembayaran ditahan escrow sampai acara selesai"],
  },
  // Role-agnostic copy for the shared login page: the role is known only after submit.
  unified: {
    headline: "Selamat datang",
    script: "kembali",
    bullets: ["Calon pengantin dan vendor", "Tim internal DuaCincin", "Langsung diarahkan ke halaman yang tepat"],
  },
};

const STEP_MS = 7000;

function World({ variant, holdRef }: { variant: Variant; holdRef: React.RefObject<HTMLDivElement | null> }) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [hold, setHold] = useState(false);
  const [formFocus, setFormFocus] = useState(false);
  const side = SIDE_CONTENT[variant];
  const scene = SCENES[idx];
  const next = (idx + 1) % SCENES.length;
  const [playing, setPlaying] = useState(true);
  const running = playing && !reduced && !hold && !formFocus;

  useEffect(() => {
    const el = holdRef.current;
    if (!el) return;
    const on = () => setFormFocus(true);
    const off = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) setFormFocus(false);
    };
    el.addEventListener("focusin", on);
    el.addEventListener("focusout", off);
    return () => {
      el.removeEventListener("focusin", on);
      el.removeEventListener("focusout", off);
    };
  }, [holdRef]);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % SCENES.length);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [running, idx]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING_SOFT);
  const sy = useSpring(py, SPRING_SOFT);
  const bgX = useTransform(sx, (v) => v * -10);
  const bgY = useTransform(sy, (v) => v * -10);
  const archX = useTransform(sx, (v) => v * 12);
  const coupleX = useTransform(sx, (v) => v * -26);
  const coupleY = useTransform(sy, (v) => v * -10);

  return (
    <div
      className="dc-on-dark relative isolate hidden w-[52%] flex-col justify-between overflow-hidden bg-dc-ink p-10 text-dc-on-dark lg:flex xl:p-14"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
        setHold(false);
      }}
    >
      <motion.div aria-hidden className="absolute -inset-8 -z-40" style={{ x: bgX, y: bgY }}>
        {SCENES.map((s, i) =>
          i === idx || i === next ? (
            <div key={s.key} className={`absolute inset-0 transition-opacity duration-[1400ms] ease-dc ${i === idx ? "opacity-100" : "opacity-0"}`}>
              <Image src={`${s.bg}-1400.webp`} alt="" fill priority={i === 0} sizes="52vw" className="object-cover" style={{ objectPosition: s.focus }} />
            </div>
          ) : null,
        )}
      </motion.div>
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(14,10,7,0.88)_0%,rgba(14,10,7,0.35)_32%,rgba(14,10,7,0.2)_55%,rgba(14,10,7,0.93)_88%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[36%] top-[12%] -z-20 [mask-image:linear-gradient(to_bottom,#000_90%,transparent)]">
        <motion.div className="absolute inset-x-0 bottom-0 flex h-full justify-center" style={{ x: archX }}>
          <div className="aspect-square h-full bg-[radial-gradient(closest-side,rgba(220,187,118,0.24),rgba(220,187,118,0.07)_55%,rgba(220,187,118,0))]" />
        </motion.div>
        <motion.div className="absolute inset-x-0 bottom-0 flex h-full justify-center" style={{ x: coupleX, y: coupleY }}>
          {/* Gold gate with the couple in its window: one object, same as the home hero. */}
          <GoldArchFrame className="h-full" shineKey={scene.key}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={scene.key}
                className="absolute inset-0"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, transition: { duration: reduced ? 0.15 : 0.5 } }}
                transition={{ duration: reduced ? 0.2 : 1, ease: EASE }}
              >
                <Image src={`${scene.couple}.webp`} alt="" fill priority={idx === 0} sizes="24vw" className="object-cover" />
              </motion.div>
            </AnimatePresence>
          </GoldArchFrame>
        </motion.div>
      </div>

      <Link href="/" aria-label="DuaCincin, ke beranda" className="self-start rounded-md py-1">
        <BrandLogo size={28} tone="light" />
      </Link>

      <div>
        <p className="max-w-md font-heading text-[clamp(2.6rem,3.6vw,3.6rem)] leading-[1.02] text-[#fbf6ec]">
          {side.headline} <span className="dc-script-light text-[1.2em]">{side.script}</span>
        </p>
        <ul className="mt-6 flex flex-col gap-2.5">
          {side.bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-[#fbf6ec]/90">
              <svg aria-hidden viewBox="0 0 26 16" fill="none" className="h-3.5 w-6 shrink-0 text-dc-gold-antique">
                <circle cx="9" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="17" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-10 flex items-center gap-3">
          {/* WCAG 2.2.2 / ui-ux-pro-max "auto-rotating content controls": the
              world changes on its own, so it can always be paused. */}
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
            aria-label={playing ? "Jeda pergantian gambar" : "Putar pergantian gambar"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#fbf6ec]/30 bg-dc-ink/40 text-[#fbf6ec] transition-colors hover:border-[#fbf6ec]/70 motion-reduce:hidden"
          >
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l10.5-6.5z" />}
            </svg>
          </button>
          <p className="text-xs text-[#fbf6ec]/75">
            {scene.caption} · Foto pengantin: {scene.coupleCredit.author} ({scene.coupleCredit.license}) · Latar: {scene.credit.title}, {scene.credit.author} ({scene.credit.license})
          </p>
        </div>
      </div>
    </div>
  );
}

type AuthCardProps = {
  title: string;
  subtitle?: string;
  variant?: Variant;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, subtitle, variant = "client", children, footer }: AuthCardProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const side = SIDE_CONTENT[variant];

  return (
    <main id="konten" className="flex min-h-screen bg-dc-ivory">
      <World variant={variant} holdRef={formRef} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones and tablets: a short painted header carries the brand. */}
        <div className="dc-on-dark relative isolate overflow-hidden bg-dc-ink px-5 pb-8 pt-6 lg:hidden">
          <Image src={`${SCENES[0].bg}-720.webp`} alt="" fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: SCENES[0].focus }} />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(14,10,7,0.85),rgba(14,10,7,0.7))]" />
          <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex rounded-md py-1">
            <BrandLogo size={24} tone="light" />
          </Link>
          <p className="mt-6 font-heading text-[2.1rem] leading-[1.05] text-[#fbf6ec]">
            {side.headline} <span className="dc-script-light text-[1.2em]">{side.script}</span>
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-16">
          <div ref={formRef} className="w-full max-w-[420px] animate-fade-up">
            <h1 className="font-heading text-[2.6rem] leading-[1.04] text-dc-ink sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-3 leading-relaxed text-dc-text-2">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-dc-line pt-6 text-center text-sm text-dc-text-2">{footer}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
