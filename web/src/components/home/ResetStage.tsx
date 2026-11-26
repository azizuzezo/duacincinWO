"use client";

// Aside for /forgot-password: instead of a photo, a little stage where the
// padlock mascot acts out the current step (asleep and waiting for mail, the
// mail arrives with a 6-digit code, the lock opens for the new key, happy
// again when done). Decorative; the same state is spoken by the form itself.
import { AnimatePresence, motion } from "framer-motion";

import { useReducedMotion } from "@/lib/motion";

export type ResetStep = "request" | "verify" | "reset" | "done";

const INK = "#231f1d";
const GOLD = "#dcbd80";
const CREAM = "#f5ecd9";
const SHACKLE = "#c9a45c";

const CAPTION: Record<ResetStep, { head: string; sub: string }> = {
  request: { head: "Tenang, ini sering terjadi", sub: "Kami kirim kode 6 digit ke emailmu." },
  verify: { head: "Surat sudah sampai", sub: "Masukkan kode dari emailmu." },
  reset: { head: "Gemboknya terbuka", sub: "Pasang password baru yang mudah kamu ingat." },
  done: { head: "Aman lagi", sub: "Silakan masuk dengan password barumu." },
};

function Lock({ open, happy, sleepy }: { open?: boolean; happy?: boolean; sleepy?: boolean }) {
  return (
    <g>
      <path d={open ? "M82 96V70a38 38 0 0 1 72-17" : "M82 96V74a38 38 0 0 1 76 0v22"} fill="none" stroke={SHACKLE} strokeWidth="12" strokeLinecap="round" />
      <rect x="56" y="92" width="128" height="104" rx="28" fill={GOLD} stroke={INK} strokeWidth="4" />
      {happy ? (
        <>
          <path d="M92 138q9-12 18 0M130 138q9-12 18 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M96 158c6 14 14 19 24 19s18-5 24-19Z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        </>
      ) : sleepy ? (
        <>
          <path d="M92 138q9 8 18 0M130 138q9 8 18 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M106 160q14 8 28 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="101" cy="136" r="6" fill={INK} />
          <circle cx="139" cy="136" r="6" fill={INK} />
          <path d="M102 158c6 10 12 14 18 14s12-4 18-14" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Envelope({ open }: { open?: boolean }) {
  return (
    <g>
      <rect x="0" y="22" width="84" height="58" rx="10" fill={CREAM} stroke={INK} strokeWidth="4" />
      <path d={open ? "M2 26 42 -4 82 26" : "M2 26 42 56 82 26"} fill={open ? "#fff" : "none"} stroke={INK} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      {open && (
        <>
          <rect x="14" y="4" width="56" height="40" rx="6" fill="#fff" stroke={INK} strokeWidth="3" />
          <text x="42" y="31" textAnchor="middle" fontSize="19" fontWeight="700" fill={INK} letterSpacing="2">
            ••••••
          </text>
        </>
      )}
    </g>
  );
}

function Key() {
  return (
    <g>
      <circle cx="22" cy="22" r="20" fill={GOLD} stroke={INK} strokeWidth="4" />
      <circle cx="22" cy="22" r="7" fill={CREAM} stroke={INK} strokeWidth="3" />
      <path d="M40 30 96 74M72 54l-8 12M86 64l-8 12" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M40 30 96 74M72 54l-8 12M86 64l-8 12" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function Sparkles() {
  return (
    <g fill={SHACKLE}>
      {[
        [40, 60, 1],
        [206, 50, 0.8],
        [214, 150, 0.6],
        [26, 160, 0.7],
      ].map(([x, y, k], i) => (
        <path key={i} transform={`translate(${x} ${y}) scale(${k})`} d="M0-16 4-4 16 0 4 4 0 16-4 4-16 0-4-4Z" />
      ))}
    </g>
  );
}

export function ResetStage({ step }: { step: ResetStep }) {
  const reduced = useReducedMotion();
  const spring = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 180, damping: 16 };
  const steps: ResetStep[] = ["request", "verify", "reset", "done"];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center text-wd-ink">
      {/* Awning. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-7"
        style={{
          backgroundImage: "radial-gradient(circle at 24px 0, #dcbd80 23px, transparent 24px), radial-gradient(circle at 72px 0, #ffffff 23px, transparent 24px)",
          backgroundSize: "96px 28px",
          backgroundRepeat: "repeat-x",
        }}
      />
      <svg aria-hidden viewBox="0 0 64 40" fill="none" className="pointer-events-none absolute -bottom-10 -left-16 h-[300px] w-[480px] text-[#c9a45c] opacity-30">
        <circle cx="24" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="40" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      <motion.svg viewBox="0 0 240 240" className="relative h-[320px] w-[320px]" animate={reduced ? undefined : { y: [0, -8, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.g key={step} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring} style={{ transformOrigin: "120px 130px" }}>
            {step === "request" && (
              <>
                <Lock sleepy />
                <g transform="translate(150 6) rotate(10)">
                  <Envelope />
                </g>
                <text x="22" y="92" fill={INK} fontSize="18" fontWeight="700">
                  z z
                </text>
              </>
            )}
            {step === "verify" && (
              <>
                <g transform="translate(60 138) scale(0.5)">
                  <Lock />
                </g>
                <g transform="translate(57 14) scale(1.5)">
                  <Envelope open />
                </g>
              </>
            )}
            {step === "reset" && (
              <>
                <Lock open />
                <g transform="translate(124 160) rotate(-8) scale(0.6)">
                  <Key />
                </g>
              </>
            )}
            {step === "done" && (
              <>
                <Lock happy />
                <Sparkles />
              </>
            )}
          </motion.g>
        </AnimatePresence>
      </motion.svg>

      <div className="relative mt-4 min-h-[88px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
            <p className="wd-display text-[1.9rem] leading-tight ">{CAPTION[step].head}</p>
            <p className="mt-2 text-[1rem] text-wd-text">{CAPTION[step].sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative mt-6 flex gap-2" aria-hidden>
        {steps.map((st) => (
          <span key={st} className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${st === step ? "w-9 bg-[#dcbd80]" : "w-3 bg-wd-line-2"}`} />
        ))}
      </div>
    </div>
  );
}
