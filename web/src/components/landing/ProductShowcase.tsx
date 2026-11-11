"use client";

// "Dari chat sampai hari-H": the product as a pinned scroll story, the one
// dark chapter of the page. On wide screens a laptop and a phone stay pinned
// on the right over a slowly changing painting while five chapters scroll on
// the left; the screens are REAL captures of the WO app (public/showcase/*,
// demo couple Shareen & Utama) and swap with the chapter in the middle of the
// viewport. On phones every chapter carries its own phone on a painting card.
// Chapter dots are buttons that scroll to a chapter (keyboard and touch).
//
// Motion purpose: pinned devices = one account that grows with the journey;
// screens crossfade with a small settle (turning a page, same device); the
// painting crossfades (where we are in the story); the phone drifts against
// the laptop on scroll (two depths, the phone is in front). Reduced motion:
// instant swaps, no drift.
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { WORLD_LIST } from "@/components/landing/scenes";
import { ButtonLink } from "@/components/ui/Button";
import { EASE, useReducedMotion } from "@/lib/motion";

type Chapter = { id: string; kicker: string; title: string; line: string; laptop: string; phone: string; laptopAlt: string; phoneAlt: string; scene: number };

const CHAPTERS: Chapter[] = [
  {
    id: "pilih",
    kicker: "Pilih vendor",
    title: "Bandingkan karya dan harganya.",
    line: "Etalase vendor: foto, paket, harga mulai dari, dan ulasan dari acara yang sudah selesai.",
    laptop: "/showcase/vendor-laptop.webp",
    phone: "/showcase/vendor-phone.webp",
    laptopAlt: "Halaman vendor di laptop: paket, harga mulai dari, dan kartu pengajuan booking",
    phoneAlt: "Halaman vendor di ponsel dengan foto portofolio dan tombol chat vendor",
    scene: 0,
  },
  {
    id: "chat",
    kicker: "Ngobrol",
    title: "Tanya langsung ke vendornya.",
    line: "Tanggal, paket, dan foto referensi tersimpan dalam satu percakapan di akunmu.",
    laptop: "/showcase/chat-laptop.webp",
    phone: "/showcase/chat-phone.webp",
    laptopAlt: "Kotak masuk chat di laptop dengan percakapan bersama vendor venue",
    phoneAlt: "Percakapan dengan vendor di ponsel",
    scene: 1,
  },
  {
    id: "booking",
    kicker: "Booking",
    title: "Setiap tahap terlihat, juga uangmu.",
    line: "DP dan pelunasan ditahan escrow sampai kamu konfirmasi acara selesai.",
    laptop: "/showcase/booking-laptop.webp",
    phone: "/showcase/booking-phone.webp",
    laptopAlt: "Detail booking di laptop: perjalanan booking dan ringkasan pembayaran escrow",
    phoneAlt: "Perjalanan booking di ponsel dengan tombol bayar pelunasan",
    scene: 2,
  },
  {
    id: "persiapan",
    kicker: "Persiapan",
    title: "Tahu apa yang perlu diurus sekarang.",
    line: "Hitung mundur, langkah berikutnya, dan checklist dari jauh hari sampai hari-H.",
    laptop: "/showcase/dashboard-laptop.webp",
    phone: "/showcase/planner-phone.webp",
    laptopAlt: "Dashboard client di laptop dengan hitung mundur dan langkah berikutnya",
    phoneAlt: "Checklist persiapan pernikahan di ponsel",
    scene: 3,
  },
  {
    id: "tamu",
    kicker: "Tamu dan meja",
    title: "RSVP masuk, tamu dapat kursi.",
    line: "Kirim tautan RSVP, lalu tempatkan tamu per meja. Rundown ada di sebelahnya.",
    laptop: "/showcase/seating-laptop.webp",
    phone: "/showcase/seating-phone.webp",
    laptopAlt: "Denah meja di laptop dengan tamu yang belum dapat kursi dan daftar meja",
    phoneAlt: "Denah meja di ponsel",
    scene: 0,
  },
];

function Screen({ src, alt, sizes, ratio, round }: { src: string; alt: string; sizes: string; ratio: string; round: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={`relative overflow-hidden bg-dc-ivory ${ratio} ${round}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={src}
          className="absolute inset-0"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.6, ease: EASE }}
        >
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover object-top" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Phone({ src, alt, sizes, className = "" }: { src: string; alt: string; sizes: string; className?: string }) {
  return (
    <div className={`rounded-[2.6rem] bg-[#0b0907] p-[3.2%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-dc-gold-antique/25 ${className}`}>
      <div className="relative">
        <Screen src={src} alt={alt} sizes={sizes} ratio="aspect-[640/1385]" round="rounded-[2.2rem]" />
        <span aria-hidden className="absolute left-1/2 top-[1.4%] h-[2.6%] w-[30%] -translate-x-1/2 rounded-full bg-[#0b0907]" />
      </div>
    </div>
  );
}

function Painting({ scene, className = "" }: { scene: number; className?: string }) {
  const reduced = useReducedMotion();
  const s = WORLD_LIST[scene];
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={s.key}
        className={`absolute inset-0 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.01 : 1.2, ease: EASE }}
      >
        <Image src={`${s.bg}-1400.webp`} alt="" fill sizes="100vw" className="object-cover opacity-55" style={{ objectPosition: s.focus }} />
      </motion.div>
    </AnimatePresence>
  );
}

export function ProductShowcase() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const drift = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -80]);
  const c = CHAPTERS[active];
  const scene = WORLD_LIST[c.scene];

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  function goTo(i: number) {
    refs.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  return (
    <section id="fitur" aria-labelledby="fitur-judul" className="dc-on-dark relative isolate scroll-mt-16 bg-dc-ink text-dc-on-dark">
      <div className="dc-container pt-20 text-center sm:pt-28 lg:pt-32">
        <p className="dc-eyebrow justify-center">Di dalam akunmu</p>
        <h2 id="fitur-judul" className="mx-auto mt-4 max-w-3xl font-heading text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.98]">
          Dari chat sampai <span className="dc-script-light whitespace-nowrap text-[1.12em]">hari-H</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-dc-on-dark/85">Layar yang kamu pakai setelah membuat akun.</p>
      </div>

      <div ref={wrap} className="relative mt-10 lg:mt-0">
        {/* Pinned stage (wide screens) */}
        <div className="sticky top-0 -mb-[min(100vh,1100px)] hidden h-screen max-h-[1100px] overflow-hidden lg:block">
          <Painting scene={c.scene} />
          <div aria-hidden className="absolute inset-0 bg-linear-to-r from-dc-ink via-dc-ink/80 to-dc-ink/30" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-dc-ink to-transparent" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-dc-ink to-transparent" />

          <div className="absolute right-[8vw] top-[46%] w-[min(46vw,760px)] -translate-y-1/2">
            <div className="rounded-t-[1.1rem] bg-[#0b0907] p-[1.4%] pb-[1.8%] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.9)] ring-1 ring-dc-gold-antique/20">
              <Screen src={c.laptop} alt={c.laptopAlt} sizes="(min-width: 1024px) 760px, 1px" ratio="aspect-[16/10]" round="rounded-[0.3rem]" />
            </div>
            <div aria-hidden className="relative mx-[-5%] h-4 rounded-b-[1.2rem] bg-linear-to-b from-[#3a3027] to-[#1d1712]">
              <span className="absolute left-1/2 top-0 h-1.5 w-[16%] -translate-x-1/2 rounded-b-md bg-[#15110d]" />
            </div>
            <motion.div style={{ y: drift }} className="absolute -bottom-[10%] -right-[6%] w-[26%]">
              <Phone src={c.phone} alt={c.phoneAlt} sizes="(min-width: 1024px) 230px, 1px" />
            </motion.div>
          </div>

          <p className="absolute bottom-6 right-[4vw] max-w-sm text-right text-xs text-dc-on-dark/75">
            Latar: {scene.credit.title}, {scene.credit.author} ({scene.credit.license})
          </p>
        </div>

        {/* Chapters */}
        <div className="dc-container relative">
          {CHAPTERS.map((ch, i) => {
            const on = i === active;
            return (
              <article
                key={ch.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-i={i}
                aria-labelledby={`fitur-h-${ch.id}`}
                className="flex flex-col justify-center py-9 sm:py-16 lg:min-h-[min(92vh,1000px)] lg:max-w-[32vw] lg:py-0 xl:max-w-[26rem]"
              >
                <p className={`flex items-center gap-3 text-sm font-semibold transition-colors duration-500 ${on ? "text-dc-gold-antique" : "text-dc-on-dark/75"}`}>
                  <span className="font-heading text-3xl tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden className="h-px w-10 bg-current" />
                  {ch.kicker}
                </p>
                <h3 id={`fitur-h-${ch.id}`} className="mt-4 font-heading text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.02] text-dc-on-dark">
                  {ch.title}
                </h3>
                <p className="mt-4 max-w-md leading-relaxed text-dc-on-dark/85">{ch.line}</p>

                {/* Phones and tablets: the chapter carries its own device on a painting card. */}
                <div className="relative mt-6 h-[420px] overflow-hidden rounded-[2rem] bg-dc-ink-2 px-[14%] pt-8 sm:h-[480px] lg:hidden">
                  <Image src={`${WORLD_LIST[ch.scene].bg}-720.webp`} alt="" fill sizes="100vw" className="object-cover opacity-50" style={{ objectPosition: WORLD_LIST[ch.scene].focus }} />
                  <div aria-hidden className="absolute inset-0 bg-linear-to-t from-dc-ink/70 to-transparent" />
                  <div className="relative mx-auto max-w-[250px] translate-y-[8%] sm:max-w-[280px]">
                    <Phone src={ch.phone} alt={ch.phoneAlt} sizes="300px" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Chapter dots (wide screens) */}
        <div className="pointer-events-none sticky bottom-8 z-10 -mt-20 hidden h-20 items-end lg:flex">
          <div className="dc-container pointer-events-auto flex gap-2" role="group" aria-label="Pilih bab">
            {CHAPTERS.map((ch, i) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Bab ${i + 1}: ${ch.kicker}`}
                aria-current={i === active ? "step" : undefined}
                className="group flex h-11 items-center"
              >
                <span className={`block h-1.5 w-10 origin-left rounded-full transition-[transform,background-color] duration-500 ease-dc ${i === active ? "scale-x-100 bg-dc-gold-antique" : "scale-x-40 bg-dc-on-dark/30 group-hover:bg-dc-on-dark/60"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dc-container pb-20 pt-6 text-center sm:pb-28 lg:pb-32 lg:pt-10">
        <ButtonLink href="/register?role=client" variant="gold" size="lg">
          Buat akun client
        </ButtonLink>
      </div>
    </section>
  );
}
