"use client";

// Banner carousel at the top of the home page, marketplace style: wide
// slides with the neighbours peeking in, native scroll-snap (swipe and
// trackpad), prev/next and one dot per slide, a pause button, and an
// auto-advance every 6s that stops while hovered or focused and never runs
// under reduced motion. Each banner is one link with real text over the
// picture (readable by search engines and screen readers; a scrim keeps
// the text above 4.5:1). Backgrounds in public/banner are real photos
// from Unsplash (credited on /kredit); Kirana's banner shows
// only when the assistant is configured.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { PhoneFrame } from "@/components/ui/DeviceFrame";
import { useReducedMotion } from "@/lib/motion";

import { ArrowRight } from "./ui";

type Banner = {
  id: string;
  href: string;
  external?: boolean;
  img: string;
  /** Object position for the photo, so the still life stays visible on phones. */
  pos: string;
  tone: "light" | "dark";
  kicker: string;
  title: string;
  line: string;
  cta: string;
  chips?: string[];
  /** Real invitation theme screens (public/invitation) fanned on the right instead of a photo. */
  phones?: { src: string; alt: string }[];
};

const BASE: Banner[] = [
  {
    id: "escrow",
    href: "/cara-kerja",
    img: "/banner/foto-escrow",
    pos: "object-[80%_50%]",
    tone: "light",
    kicker: "Dana Aman",
    title: "Bayar vendor dengan tenang",
    line: "DP dan pelunasan ditahan DuaCincin sampai acaramu selesai.",
    cta: "Lihat cara kerjanya",
  },
  {
    id: "undangan",
    href: "https://invitation.duacincin.id",
    external: true,
    img: "",
    pos: "",
    phones: [
      { src: "/invitation/classic.webp", alt: "" },
      { src: "/invitation/java.webp", alt: "Tema Jawa DuaCincin Digital Invitation di ponsel" },
      { src: "/invitation/royal.webp", alt: "" },
    ],
    tone: "dark",
    kicker: "DuaCincin Digital Invitation",
    title: "Digital Invitation, terisi dari rencanamu",
    line: "Nama, tanggal, tempat, dan daftar tamu tanpa mengetik ulang.",
    cta: "Buat undangan",
    chips: ["Nama kalian", "Tanggal dan tempat", "Daftar tamu"],
  },
  {
    id: "rencana",
    href: "/register?role=client",
    img: "/banner/foto-rencana",
    pos: "object-[80%_50%]",
    tone: "light",
    kicker: "Budget planner",
    title: "Susun budget pernikahan dalam satu tempat",
    line: "Bagi anggaran per kategori, lalu cari vendor yang pas.",
    cta: "Buat akun gratis",
  },
  {
    id: "vendor",
    href: "/register?role=vendor",
    img: "/banner/foto-venue-taman",
    pos: "object-[55%_70%]",
    phones: [
      { src: "/showcase/pages/v-booking-m.webp", alt: "" },
      { src: "/showcase/pages/v-dashboard-m.webp", alt: "Dashboard vendor DuaCincin di ponsel: permintaan baru dan acara terdekat" },
      { src: "/showcase/pages/v-pencairan-m.webp", alt: "" },
    ],
    tone: "dark",
    kicker: "Untuk vendor",
    title: "Punya usaha pernikahan? Terima booking di sini",
    line: "Dana cair setelah acara selesai. Komisi ditambahkan di atas hargamu.",
    cta: "Daftar sebagai vendor",
    chips: ["Etalase dan portofolio", "Booking lewat chat", "Pencairan jelas"],
  },
];

const KIRANA: Banner = {
  id: "kirana",
  href: "/kirana",
  img: "",
  pos: "",
  tone: "light",
  kicker: "Asisten AI",
  title: "Tanya Kirana soal rencanamu",
  line: "Budget, vendor di kotamu, sampai urutan persiapan.",
  cta: "Mulai bertanya",
};

const STEP_MS = 6000;

function Slide({ b, i, n, first }: { b: Banner; i: number; n: number; first: boolean }) {
  const dark = b.tone === "dark";
  const body = (
    <>
      {b.phones ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,#4a3a2c_0%,#2b231d_55%,#1f1915_100%)]">
          {b.img && <Image src={`${b.img}.webp`} alt="" fill sizes="(min-width: 1280px) 1180px, 92vw" className={`object-cover opacity-35 ${b.pos}`} />}
          <div className="absolute right-[4%] top-1/2 hidden h-[86%] -translate-y-1/2 sm:block lg:right-[8%]">
            {b.phones.map((p, k) => (
              <div
                key={p.src}
                className={`absolute top-1/2 aspect-[100/214.5] h-full -translate-y-1/2 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                  k === 1 ? "z-10 group-hover:-translate-y-[54%]" : k === 0 ? "-translate-x-[62%] -rotate-6 scale-90" : "translate-x-[62%] rotate-6 scale-90"
                }`}
                style={{ right: 0 }}
              >
                <PhoneFrame src={p.src} alt={p.alt} sizes="180px" immersive screen="dark" surface="dark" />
              </div>
            ))}
          </div>
          <div className="absolute right-[7%] top-5 h-[40%] rotate-3 sm:hidden">
            <div className="aspect-[100/214.5] h-full">
              <PhoneFrame src={b.phones[1].src} alt={b.phones[1].alt} sizes="120px" immersive screen="dark" surface="dark" />
            </div>
          </div>
        </div>
      ) : b.img ? (
        <Image
          src={`${b.img}.webp`}
          alt=""
          fill
          priority={first}
          sizes="(min-width: 1280px) 1180px, 92vw"
          className={`object-cover ${b.pos} [transform:translate3d(calc(var(--px,0)*-14px),calc(var(--py,0)*-10px),0)_scale(1.04)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none motion-reduce:transition-none`}
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#fbf7ef_0%,#f5ecd9_55%,#ecdcbc_100%)]">
          <Image src="/kirana/kirana-idle.webp" alt="" width={384} height={410} className="absolute right-[6%] top-4 h-[40%] w-auto object-contain sm:bottom-0 sm:top-auto sm:h-[92%]" />
        </div>
      )}
      {/* Scrim: guarantees text contrast over any part of the picture. */}
      <div
        aria-hidden
        className={`absolute inset-0 ${
          dark
            ? "bg-linear-to-r from-black/70 via-black/45 to-black/0 max-sm:bg-linear-to-t max-sm:from-black/80 max-sm:via-black/50"
            : "bg-linear-to-r from-white/90 via-white/70 to-white/0 max-sm:bg-linear-to-t max-sm:from-white/95 max-sm:via-white/75"
        }`}
      />
      <div className="relative flex h-full max-w-[560px] flex-col justify-end p-6 sm:justify-center sm:p-10 lg:p-14">
        <p className={`text-xs font-semibold sm:text-sm ${dark ? "text-[#e3c78c]" : "text-wd-accent-ink"}`}>{b.kicker}</p>
        <p className={`wd-display mt-2 text-[clamp(1.5rem,3.4vw,2.7rem)] leading-[1.08] ${dark ? "!text-white" : ""}`}>{b.title}</p>
        <p className={`mt-2 max-w-[42ch] text-sm leading-relaxed sm:mt-3 sm:text-[1rem] ${dark ? "text-white/90" : "text-wd-text"}`}>{b.line}</p>
        {b.chips && (
          <ul className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
            {b.chips.map((c) => (
              <li key={c} className="rounded-full border border-white/40 px-3 py-1 text-xs font-medium text-white">
                {c}
              </li>
            ))}
          </ul>
        )}
        <span
          className={`mt-4 inline-flex min-h-10 items-center gap-2 self-start rounded-full px-5 text-sm font-semibold transition-colors sm:mt-6 ${
            dark ? "bg-white text-wd-ink group-hover:bg-wd-blush" : "bg-wd-accent text-wd-ink group-hover:bg-wd-accent-deep"
          }`}
        >
          {b.cta}
          <ArrowRight size={14} />
        </span>
      </div>
    </>
  );
  const cls = "group relative block h-full overflow-hidden rounded-[20px] bg-wd-blush sm:rounded-[24px]";
  // Mouse parallax: the picture drifts a few pixels against the pointer (depth), never under reduced motion.
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--px", String((e.clientX - r.left) / r.width - 0.5));
    e.currentTarget.style.setProperty("--py", String((e.clientY - r.top) / r.height - 0.5));
  };
  const onLeave = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--px", "0");
    e.currentTarget.style.setProperty("--py", "0");
  };
  return (
    <div role="group" aria-roledescription="slide" aria-label={`${i + 1} dari ${n}`} className="h-[360px] w-[88vw] shrink-0 sm:h-[300px] lg:h-[340px] lg:w-[min(1180px,86vw)]">
      {b.external ? (
        <a href={b.href} className={cls} onPointerMove={onMove} onPointerLeave={onLeave}>
          {body}
        </a>
      ) : (
        <Link href={b.href} className={cls} onPointerMove={onMove} onPointerLeave={onLeave}>
          {body}
        </Link>
      )}
    </div>
  );
}

export function Banners({ kirana }: { kirana: boolean }) {
  const slides = kirana ? [BASE[0], KIRANA, ...BASE.slice(1)] : BASE;
  const n = slides.length;
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  // Open on the second banner so both neighbours peek in, as on the big marketplaces.
  const start = n > 2 ? 1 : 0;
  const [index, setIndex] = useState(start);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (i: number) => {
      const el = track.current;
      const slide = el?.children[i] as HTMLElement | undefined;
      if (!el || !slide) return;
      const left = slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2;
      el.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced],
  );

  useLayoutEffect(() => {
    const el = track.current;
    const slide = el?.children[start] as HTMLElement | undefined;
    if (el && slide) el.scrollLeft = slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2;
  }, [start]);

  // The visible slide follows the scroll position (buttons, dots, swipe alike).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const h = c as HTMLElement;
        const d = Math.abs(h.offsetLeft + h.clientWidth / 2 - mid);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      setIndex(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (reduced || paused || hold) return;
    const t = window.setTimeout(() => goTo((index + 1) % n), STEP_MS);
    return () => window.clearTimeout(t);
  }, [reduced, paused, hold, index, n, goTo]);

  const side = "calc((100vw - min(1180px, 86vw)) / 2)";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Info dan promo DuaCincin"
      className="relative bg-white pt-5 sm:pt-6"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHold(false);
      }}
    >
      <div
        ref={track}
        className="wd-banners flex gap-3 overflow-x-auto sm:gap-4"
        style={{ paddingInline: `max(6vw, ${side})` }}
      >
        {slides.map((b, i) => (
          <Slide key={b.id} b={b} i={i} n={n} first={i <= start} />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {`Banner ${index + 1} dari ${n}: ${slides[index].title}`}
      </p>

      {/* Prev / next sit on the peeking edges (desktop). */}
      {([-1, 1] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => goTo((index + dir + n) % n)}
          aria-label={dir < 0 ? "Banner sebelumnya" : "Banner berikutnya"}
          className={`absolute top-[calc(50%-4px)] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-wd-ink shadow-wd-card transition-colors hover:bg-white lg:flex ${dir < 0 ? "left-[max(16px,calc((100vw-min(1180px,86vw))/2-22px))]" : "right-[max(16px,calc((100vw-min(1180px,86vw))/2-22px))]"}`}
        >
          <ArrowRight className={dir < 0 ? "rotate-180" : ""} />
        </button>
      ))}

      <div className="mt-1 flex items-center justify-center">
        {slides.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ke banner ${i + 1}: ${b.title}`}
            aria-current={i === index ? "true" : undefined}
            className="group flex h-11 w-7 items-center justify-center"
          >
            <span className={`relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ${i === index ? "w-6 bg-wd-accent-soft" : "w-1.5 bg-wd-line-2 group-hover:bg-wd-muted"}`}>
              {i === index && (
                // Fills over the 6s the banner stays; frozen while paused or hovered.
                <span
                  key={index}
                  className={`absolute inset-0 rounded-full bg-wd-accent ${reduced || paused ? "" : "wd-progress"}`}
                  data-paused={hold}
                  style={{ ["--wd-progress-ms" as string]: `${STEP_MS}ms` }}
                />
              )}
            </span>
          </button>
        ))}
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "Putar banner otomatis" : "Jeda banner otomatis"}
            className="ml-1 flex h-11 w-11 items-center justify-center rounded-full text-wd-muted transition-colors hover:bg-wd-blush hover:text-wd-ink"
          >
            <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              {paused ? <path d="M7 5v14l12-7z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
