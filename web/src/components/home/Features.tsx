"use client";

// "Kenapa DuaCincin": what the account does, as one panel. Left, five
// disclosure buttons (one open at a time, Arrow/Home/End move between them);
// the open one shows its one-line explanation and, on phones, its real
// screen right under it. Desktop shows that screen in a phone over a soft
// photo on the right. It advances every 7s with a progress line, pausing
// while hovered or focused, stopping once the visitor opens one or presses
// pause, and never under reduced motion. Copy matches the product (escrow:
// money held until the couple confirms the event is done).
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { dissolve, EASE, useReducedMotion } from "@/lib/motion";

import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { SectionHead, SeeAll } from "./ui";

const STEP_MS = 7000;

const FEATURES = [
  {
    id: "escrow",
    title: "Dana Aman sampai acara selesai",
    body: "DP dan pelunasan ditahan DuaCincin, baru diteruskan ke vendor setelah kamu konfirmasi acara selesai.",
    phone: "/showcase/booking-phone.webp",
    phoneAlt: "Perjalanan booking di ponsel dengan status Dana Aman",
    photo: "/photos/pinterest/pelaminan-kristal.webp",
  },
  {
    id: "chat",
    title: "Chat langsung dengan vendor",
    body: "Tanya tanggal dan paket, kirim foto referensi. Semua tersimpan di akunmu.",
    phone: "/showcase/chat-phone.webp",
    phoneAlt: "Percakapan dengan vendor di ponsel",
    photo: "/photos/pinterest/pasangan-sofa-bunga.webp",
  },
  {
    id: "planner",
    title: "Budget dan checklist",
    body: "Bagi anggaran per kategori dan lihat apa yang perlu diurus sampai hari-H.",
    phone: "/showcase/planner-phone.webp",
    phoneAlt: "Checklist persiapan pernikahan di ponsel",
    photo: "/photos/pinterest/resepsi-taman.webp",
  },
  {
    id: "undangan",
    title: "Digital Invitation terisi otomatis",
    body: "Nama, tanggal, tempat, dan daftar tamu diambil dari rencanamu.",
    phone: "/invitation/luminousgate.webp",
    phoneAlt: "Tema Luminous Gate DuaCincin Digital Invitation di ponsel",
    photo: "/photos/pinterest/suvenir-anggrek.webp",
  },
  {
    id: "konsultan",
    title: "Konsultan yang membantu memilih",
    body: "Wedding consultant kami merekomendasikan vendor yang cocok, lewat chat di akunmu.",
    phone: "/showcase/konsultasi-phone.webp",
    phoneAlt: "Halaman konsultasi dengan wedding consultant di ponsel",
    photo: "/photos/pinterest/konsultan-rias.webp",
  },
];

/** Real phone mockup (status bar with time, signal, wifi, battery). Invitation
 * covers are full-screen pages, so they sit under a floating status bar. */
function Phone({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  const cover = src.startsWith("/invitation/");
  return <PhoneFrame src={src} alt={alt} sizes={sizes} immersive={cover} screen={cover ? "dark" : "light"} />;
}

export function Features() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const [stopped, setStopped] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const auto = !reduced && !stopped;

  useEffect(() => {
    if (!auto || hold) return;
    const t = window.setTimeout(() => setActive((i) => (i + 1) % FEATURES.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, hold, active]);

  const open = (i: number, focus = false) => {
    setActive(i);
    setStopped(true);
    if (focus) buttons.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const last = FEATURES.length - 1;
    const to = e.key === "ArrowDown" ? (i === last ? 0 : i + 1) : e.key === "ArrowUp" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    open(to, true);
  };

  const f = FEATURES[active];
  const fade = dissolve(reduced);

  return (
    <section aria-labelledby="fitur-judul" className="bg-wd-paper py-14 sm:py-20">
      <div className="wd-container">
        <Reveal>
          <SectionHead
            id="fitur-judul"
            title={
              <>
                Satu akun, dari cari vendor <em>sampai hari-H</em>
              </>
            }
            action={<SeeAll href="/cara-kerja">Cara kerja Dana Aman</SeeAll>}
          />
        </Reveal>

        <div
          className="mt-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
          onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
          onPointerLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setHold(false);
          }}
        >
          <div>
            <ul className="border-t border-wd-line">
              {FEATURES.map((item, i) => {
                const on = i === active;
                return (
                  <li key={item.id} className="border-b border-wd-line">
                    <h3>
                      <button
                        ref={(el) => {
                          buttons.current[i] = el;
                        }}
                        type="button"
                        aria-expanded={on}
                        aria-controls={`fitur-isi-${item.id}`}
                        onClick={() => open(i)}
                        onKeyDown={(e) => onKey(e, i)}
                        className="group flex w-full items-center gap-4 py-4 text-left"
                      >
                        <span className={`font-wd-display text-[1.05rem] tabular-nums transition-colors ${on ? "text-wd-accent-ink" : "text-wd-muted"}`}>0{i + 1}</span>
                        <span className={`flex-1 text-[1.12rem] font-semibold leading-snug transition-colors sm:text-[1.2rem] ${on ? "text-wd-ink" : "text-wd-muted group-hover:text-wd-ink"}`}>
                          {item.title}
                        </span>
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div
                          id={`fitur-isi-${item.id}`}
                          className="overflow-hidden"
                          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.36, ease: EASE }}
                        >
                          <p className="max-w-[52ch] pb-4 pl-9 text-[0.98rem] leading-[1.7] text-wd-text">{item.body}</p>
                          <div className="mx-auto mb-5 w-[46%] max-w-[200px] lg:hidden">
                            <Phone src={item.phone} alt={item.phoneAlt} sizes="200px" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {on && auto && (
                      <span aria-hidden className="-mb-px block h-px">
                        <span key={active} className="wd-progress block h-px bg-wd-accent" data-paused={hold} style={{ ["--wd-progress-ms" as string]: `${STEP_MS}ms` }} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {!reduced && (
              <button
                type="button"
                onClick={() => setStopped((c) => !c)}
                aria-pressed={stopped}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-wd-muted transition-colors hover:bg-wd-blush hover:text-wd-ink"
              >
                <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  {stopped ? <path d="M7 5v14l12-7z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
                </svg>
                {stopped ? "Putar otomatis" : "Jeda putar otomatis"}
              </button>
            )}
          </div>

          {/* Desktop stage: the open feature's real screen over a soft photo. */}
          <div aria-hidden className="relative mx-auto hidden aspect-[5/6] w-full max-w-[520px] overflow-hidden rounded-[28px] bg-wd-blush lg:block">
            <AnimatePresence initial={false}>
              <motion.div key={f.photo} className="absolute inset-0" {...fade}>
                <Image src={f.photo} alt="" fill sizes="520px" className="object-cover" />
                <div className="absolute inset-0 bg-white/20" />
              </motion.div>
            </AnimatePresence>
            <div className="absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={f.phone}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <Phone src={f.phone} alt="" sizes="240px" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
