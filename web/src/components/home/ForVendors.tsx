// Vendor recruitment: the one dark block on the page (ink). A scalloped
// "shop awning" in gold and cream hangs from its top edge (the vendor's
// storefront), the three onboarding steps carry friendly icons, and next to
// the real vendor dashboard screen float three little notification stickers
// (new booking request, deposit held by Dana Aman, payout after the event).
// The stickers are illustrations of the product's own screens: no names, no
// numbers. They bob only while the block is hovered, never under reduced
// motion. Steps match the onboarding: sign up, team verification, bookings
// through chat with payout after the event.
import Image from "next/image";
import type { ReactNode } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { WdLink } from "./ui";

const INK = "#231f1d";

const STEPS: { text: string; icon: ReactNode }[] = [
  {
    text: "Daftar dan unggah portofolio",
    icon: (
      <>
        <rect x="6" y="9" width="36" height="30" rx="7" fill="#f5ecd9" stroke={INK} strokeWidth="2" />
        <circle cx="18" cy="21" r="4" fill="#dcbd80" stroke={INK} strokeWidth="1.8" />
        <path d="m8 35 10-9 8 7 6-5 10 8" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="33" cy="17" r="1.4" fill={INK} />
        <path d="M30 20.5c1 1.2 2 1.6 3 1.6s2-.4 3-1.6" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    text: "Tim DuaCincin memverifikasi akunmu",
    icon: (
      <>
        <path d="M24 5 8 11v11c0 10 6.5 17.5 16 21 9.5-3.5 16-11 16-21V11L24 5Z" fill="#dcbd80" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="m16 24 6 6 11-12" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    text: "Terima booking, dana cair setelah acara selesai",
    icon: (
      <>
        <rect x="6" y="13" width="36" height="26" rx="6" fill="#f5ecd9" stroke={INK} strokeWidth="2" />
        <path d="M6 20h36" stroke={INK} strokeWidth="2" />
        <rect x="29" y="25" width="13" height="9" rx="4.5" fill="#dcbd80" stroke={INK} strokeWidth="2" />
        <circle cx="34.5" cy="29.5" r="1.5" fill={INK} />
        <circle cx="15" cy="28" r="1.5" fill={INK} />
        <circle cx="21" cy="28" r="1.5" fill={INK} />
        <path d="M15 32c1 1.4 2 1.9 3 1.9s2-.5 3-1.9" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
];

/** A little notification card, as the vendor would see it in the app. */
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

const SVG = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function ForVendors() {
  return (
    <section aria-labelledby="mitra-judul" className="bg-white py-6 sm:py-10">
      <div className="wd-container">
        <Reveal className="group relative isolate grid overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_85%_30%,#3a2f27_0%,#231f1d_55%,#1b1815_100%)] text-white lg:grid-cols-2">
          {/* The shop awning: gold and cream scallops hanging from the top edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-7"
            style={{
              backgroundImage: "radial-gradient(circle at 24px 0, #dcbd80 23px, transparent 24px), radial-gradient(circle at 72px 0, #f5ecd9 23px, transparent 24px)",
              backgroundSize: "96px 28px",
              backgroundRepeat: "repeat-x",
            }}
          />
          {/* Two rings, the brand motif, faint behind the copy. */}
          <svg aria-hidden viewBox="0 0 64 40" fill="none" className="pointer-events-none absolute -left-24 bottom-0 -z-10 hidden h-[300px] w-[480px] text-[#dcbd80] opacity-[0.12] lg:block">
            <circle cx="24" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="40" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" />
          </svg>

          <div className="p-8 pt-14 sm:p-12 sm:pt-16 lg:p-16 lg:pt-20">
            <p className="wd-kicker !text-[#e3c78c]">Untuk vendor</p>
            <h2 id="mitra-judul" className="wd-display mt-4 text-[clamp(2.1rem,4vw,3.2rem)] leading-[1.08] !text-white">
              Punya usaha pernikahan? <em className="!text-[#e3c78c]">Terima booking di sini.</em>
            </h2>
            <ol className="mt-8 flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <li key={s.text} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] p-3 pr-5 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/[0.1]">
                  <span className="relative h-12 w-12 shrink-0 rounded-xl bg-[#dcbd80]/25 p-1.5 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
                    <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
                      {s.icon}
                    </svg>
                  </span>
                  <span className="text-[0.98rem] leading-snug text-white/90">
                    <span className="mr-2 font-semibold tabular-nums text-[#e3c78c]">{i + 1}.</span>
                    {s.text}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
              <WdLink href="/register?role=vendor" variant="white">
                Daftar sebagai vendor
              </WdLink>
              <WdLink href="/untuk-vendor" variant="ink" className="border border-white/30 hover:border-white">
                Lihat syarat dan komisi
              </WdLink>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden pt-7">
            <Image src="/photos/pinterest/pendopo-kursi-tamu.webp" alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover opacity-60" />
            <div className="absolute inset-0 bg-linear-to-r from-[#231f1d]/70 to-transparent" aria-hidden />
            <div className="absolute bottom-0 left-1/2 w-[200px] -translate-x-1/2 translate-y-[16%] sm:w-[230px]">
              <PhoneFrame src="/showcase/vendordash-phone.webp" alt="Dashboard vendor di ponsel: permintaan baru dan acara terdekat" sizes="230px" surface="dark" />
            </div>
            <Sticker
              className="left-[4%] top-[18%] sm:left-[8%]"
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
              className="right-[3%] top-[44%] sm:right-[6%]"
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
              className="bottom-[8%] left-[2%] hidden sm:block sm:left-[6%]"
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
        </Reveal>
      </div>
    </section>
  );
}
