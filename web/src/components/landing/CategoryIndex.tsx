"use client";

// Categories as a photo index: a list of the seven real categories in large
// serif type; hovering or focusing a name brings its picture into the frame
// beside it (desktop). On phones the same index becomes a swipeable row of
// photo cards. Pictures: Pexels placeholders already used on this page
// (public/stock/README.md) and the owner's real decor/attire cutouts, staged
// on a warm "studio" ground.
//
// Motion purpose: the frame crossfades with a slight scale so the eye moves
// from the word to its picture; the list stays still so it stays readable.

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { VENDOR_CATEGORIES } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

type Pic = { src: string; alt: string; studio?: boolean; note: string };

const PICS: Record<string, Pic> = {
  venue: { src: "/stock/ballroom.webp", alt: "Ballroom dengan meja bundar dan rangkaian bunga", note: "Gedung, ballroom, taman, rumah adat" },
  catering: { src: "/scene/arch2.webp", alt: "Meja makan dengan lilin, gelas, dan rangkaian bunga", studio: true, note: "Prasmanan, gubukan, menu adat" },
  decor: { src: "/scene/arch1.webp", alt: "Gapura bunga putih dan pampas", studio: true, note: "Pelaminan, gapura, bunga, lampu" },
  mua_attire: { src: "/scene/atire1.webp", alt: "Pengantin dengan siger dan untaian melati", studio: true, note: "Rias, busana adat, gaun, beskap" },
  photo_video: { src: "/stock/photographer.webp", alt: "Fotografer memotret pasangan pengantin", note: "Foto, video, prewedding" },
  entertainment: { src: "/stock/chandelier.webp", alt: "Chandelier kristal di atas rangkaian bunga putih", note: "Musik, MC, hiburan adat" },
  invitation_souvenir: { src: "/scene/arch4.webp", alt: "Papan ucapan selamat datang berhias bunga", studio: true, note: "Undangan cetak, papan nama, suvenir" },
};

function Picture({ pic, sizes, priority = false }: { pic: Pic; sizes: string; priority?: boolean }) {
  return pic.studio ? (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#fffaf0_0%,#efe3cc_55%,#d9c6a3_100%)]">
      <div aria-hidden className="absolute inset-x-[12%] bottom-[9%] h-8 rounded-[50%] bg-dc-ink/20 blur-xl" />
      <Image src={pic.src} alt={pic.alt} fill sizes={sizes} priority={priority} className="object-contain p-[9%] pb-[10%]" />
    </div>
  ) : (
    <Image src={pic.src} alt={pic.alt} fill sizes={sizes} priority={priority} className="object-cover" />
  );
}

export function CategoryIndex() {
  const [active, setActive] = useState(VENDOR_CATEGORIES[0].value);
  const reduced = useReducedMotion();
  const pic = PICS[active];

  return (
    <section aria-labelledby="kategori-judul" className="dc-grain relative overflow-hidden bg-dc-ivory">
      <div className="dc-container py-20 sm:py-28 lg:py-36">
        <Reveal className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dc-eyebrow">Tujuh kategori vendor</p>
            <h2 id="kategori-judul" className="mt-4 max-w-2xl font-heading text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.02] text-dc-ink">
              Semua yang dibutuhkan hari-H, <span className="dc-em">dalam satu direktori.</span>
            </h2>
          </div>
          <Link href="/vendors" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay lg:self-auto">
            Lihat semua vendor
          </Link>
        </Reveal>

        {/* Phones and tablets: swipeable photo cards. */}
        <Reveal>
        <ul className="dc-stagger -mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:hidden">
          {VENDOR_CATEGORIES.map((c, i) => (
            <li key={c.value} className="w-[72%] shrink-0 snap-start sm:w-[42%]">
              <Link href={`/vendors?category=${c.value}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-dc-cream">
                  <Picture pic={PICS[c.value]} sizes="(min-width: 640px) 42vw, 72vw" />
                </div>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-xs font-semibold tabular-nums text-dc-clay">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-heading text-[1.65rem] leading-tight text-dc-ink">{c.label}</span>
                </p>
                <p className="text-sm text-dc-text-3">{PICS[c.value].note}</p>
              </Link>
            </li>
          ))}
        </ul>
        </Reveal>

        {/* Desktop: index list + one picture frame. */}
        <div className="mt-14 hidden grid-cols-12 gap-12 lg:grid">
          <Reveal className="col-span-7">
          <ol className="dc-stagger border-t border-dc-line-strong">
            {VENDOR_CATEGORIES.map((c, i) => {
              const on = c.value === active;
              return (
                <li key={c.value} className="border-b border-dc-line-strong">
                  <Link
                    href={`/vendors?category=${c.value}`}
                    onMouseEnter={() => setActive(c.value)}
                    onFocus={() => setActive(c.value)}
                    className="group grid min-h-[84px] grid-cols-[3rem_1fr_auto] items-center gap-4 py-3 focus-visible:outline-offset-[-2px]"
                  >
                    <span className={`text-sm font-semibold tabular-nums transition-colors ${on ? "text-dc-clay" : "text-dc-text-3"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span
                        className={`block font-heading text-[2.6rem] leading-none transition-[color,transform] duration-500 ease-dc ${
                          on ? "translate-x-2 text-dc-ink" : "text-dc-ink/55 group-hover:text-dc-ink"
                        }`}
                      >
                        {c.label}
                      </span>
                      <span className={`mt-1 block text-sm transition-colors ${on ? "text-dc-text-2" : "text-dc-text-3"}`}>{PICS[c.value].note}</span>
                    </span>
                    <svg
                      aria-hidden
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className={`transition-[opacity,transform] duration-500 ease-dc ${on ? "translate-x-0 text-dc-clay opacity-100" : "-translate-x-2 opacity-0"}`}
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ol>
          </Reveal>
          <div className="col-span-5">
            <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-2xl bg-dc-cream shadow-lift">
              <AnimatePresence initial={false}>
                <motion.div
                  key={active}
                  className="absolute inset-0"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0.15 : 0.8, ease: EASE }}
                >
                  <Picture pic={pic} sizes="(min-width: 1024px) 480px, 1px" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-dc-ink/80 to-transparent p-6 pt-20">
                <p className="font-heading text-3xl text-dc-on-dark">{VENDOR_CATEGORIES.find((c) => c.value === active)?.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
