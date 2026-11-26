// /untuk-vendor hero: a champagne "storefront" card with a scalloped awning
// on top, the pitch on the left and the real vendor dashboard on a phone on
// the right, with three little notification stickers (illustrations of the
// product's own screens, no names or numbers). Stickers bob only on hover and
// never under reduced motion.
import Link from "next/link";
import type { ReactNode } from "react";

import { wdButton } from "@/components/home/ui";
import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { Percent } from "./Percent";

const INK = "#231f1d";
const SVG = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Sticker({ icon, title, sub, className, tilt }: { icon: ReactNode; title: string; sub: string; className: string; tilt: string }) {
  return (
    <div aria-hidden className={`absolute z-10 ${className}`}>
      <div
        className="wd-anim wd-float flex items-center gap-2.5 rounded-2xl bg-white py-2 pl-2 pr-3.5 text-wd-ink shadow-wd-pop ring-1 ring-black/5"
        style={{ "--r": tilt, animationDelay: tilt.startsWith("-") ? "0.4s" : "0s" } as React.CSSProperties}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wd-accent text-wd-ink">{icon}</span>
        <span className="leading-tight">
          <span className="block text-[0.8rem] font-semibold">{title}</span>
          <span className="block text-[0.7rem] text-wd-muted">{sub}</span>
        </span>
      </div>
    </div>
  );
}

/** Face-icon facts: each one a tiny character, like the home page. */
const FACTS: { icon: ReactNode; head: ReactNode; label: string }[] = [
  {
    head: <Percent value={10} />,
    label: "Komisi, di atas hargamu",
    icon: (
      <>
        <circle cx="24" cy="24" r="18" fill="#dcbd80" stroke={INK} strokeWidth="2" />
        <circle cx="18" cy="21" r="1.7" fill={INK} />
        <circle cx="30" cy="21" r="1.7" fill={INK} />
        <path d="M17 29c2 2.6 4.3 3.6 7 3.6s5-1 7-3.6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  {
    head: <Percent value={30} />,
    label: "DP ditahan DuaCincin",
    icon: (
      <>
        <path d="M24 5 8 11v11c0 10 6.5 17.5 16 21 9.5-3.5 16-11 16-21V11L24 5Z" fill="#f5ecd9" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="19" cy="23" r="1.6" fill={INK} />
        <circle cx="29" cy="23" r="1.6" fill={INK} />
        <path d="M19 29c1.5 1.8 3.2 2.5 5 2.5s3.5-.7 5-2.5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  {
    head: <>Setelah acara</>,
    label: "Dana cair ke rekeningmu",
    icon: (
      <>
        <rect x="6" y="12" width="36" height="26" rx="7" fill="#dcbd80" stroke={INK} strokeWidth="2" />
        <circle cx="18" cy="24" r="1.7" fill={INK} />
        <circle cx="30" cy="24" r="1.7" fill={INK} />
        <path d="M18 30c1.7 2 3.7 2.8 6 2.8s4.3-.8 6-2.8" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
];

export function VendorHero() {
  return (
    <section aria-labelledby="uv-judul" className="bg-white pb-6 pt-4 sm:pb-10">
      <div className="wd-container">
        <div className="group relative isolate overflow-hidden rounded-[32px] bg-wd-champagne">
          {/* Awning. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-7"
            style={{
              backgroundImage: "radial-gradient(circle at 24px 0, #dcbd80 23px, transparent 24px), radial-gradient(circle at 72px 0, #ffffff 23px, transparent 24px)",
              backgroundSize: "96px 28px",
              backgroundRepeat: "repeat-x",
            }}
          />
          {/* Two rings, faint. */}
          <svg aria-hidden viewBox="0 0 64 40" fill="none" className="pointer-events-none absolute -bottom-10 -right-10 -z-10 hidden h-[320px] w-[520px] text-[#c9a45c] opacity-30 lg:block">
            <circle cx="24" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="40" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
          </svg>

          <div className="grid items-center lg:grid-cols-12">
            <div className="p-7 pt-14 sm:p-12 sm:pt-16 lg:col-span-7 lg:p-16 lg:pt-20">
              <p className="wd-kicker">Untuk vendor</p>
              <h1 id="uv-judul" className="wd-display mt-4 text-[clamp(2.3rem,4.6vw,3.7rem)] leading-[1.06]">
                Punya usaha pernikahan? <em>Tampilkan karyamu.</em>
              </h1>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-wd-text">
                Calon pengantin mencari, berdiskusi, dan membayar di satu tempat. Kamu fokus mengerjakan acara.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register?role=vendor" className={wdButton({ size: "lg", variant: "ink" })}>
                  Daftar sebagai vendor
                </Link>
                <Link href="#yang-kamu-dapat" className={wdButton({ variant: "outline", size: "lg" })}>
                  Lihat dashboard vendor
                </Link>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-2 sm:gap-3">
                {FACTS.map((f) => (
                  <div key={f.label} className="rounded-2xl bg-white/80 p-3 ring-1 ring-[#e2d0aa] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-4">
                    <span className="block h-9 w-9 sm:h-11 sm:w-11">
                      <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
                        {f.icon}
                      </svg>
                    </span>
                    <dd className="mt-2 text-[0.98rem] font-semibold leading-tight text-wd-accent-ink tabular-nums sm:text-[1.2rem]">{f.head}</dd>
                    <dt className="mt-0.5 text-[0.7rem] leading-snug text-wd-text sm:text-[0.8rem]">{f.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto h-[420px] w-full max-w-[420px] overflow-hidden pt-4 lg:col-span-5 lg:h-[560px] lg:max-w-none">
              <div className="absolute bottom-0 left-1/2 w-[230px] -translate-x-1/2 translate-y-[12%] sm:w-[250px]">
                <PhoneFrame src="/showcase/vendordash-phone.webp" alt="Dashboard vendor di ponsel: permintaan baru dan acara terdekat" sizes="250px" surface="dark" />
              </div>
              <Sticker
                className="left-[2%] top-[16%] sm:left-[6%]"
                tilt="-4deg"
                title="Permintaan booking baru"
                sub="Menunggu jawabanmu"
                icon={
                  <svg {...SVG}>
                    <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9ZM10 20a2 2 0 0 0 4 0" />
                  </svg>
                }
              />
              <Sticker
                className="right-[2%] top-[62%] sm:right-[4%] sm:top-[42%]"
                tilt="3deg"
                title="DP masuk Dana Aman"
                sub="Ditahan DuaCincin"
                icon={
                  <svg {...SVG}>
                    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4" />
                  </svg>
                }
              />
              <Sticker
                className="bottom-[10%] left-[2%] hidden sm:block sm:left-[4%]"
                tilt="-2deg"
                title="Dana cair"
                sub="Setelah acara selesai"
                icon={
                  <svg {...SVG}>
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M9.5 12.5 11.3 14.3 15 10.2" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
