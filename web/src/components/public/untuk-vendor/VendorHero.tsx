// /untuk-vendor hero: a champagne "storefront" with a scalloped awning on top.
// Left: the pitch, two buttons and the three facts as plain figures with
// hairlines (no boxes). Right: the real vendor dashboard on a phone, nothing
// floating around it.
import Link from "next/link";
import type { ReactNode } from "react";

import { wdButton } from "@/components/home/ui";
import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { Percent } from "./Percent";

const FACTS: { head: ReactNode; label: string }[] = [
  { head: <Percent value={10} />, label: "Komisi, di atas hargamu" },
  { head: <Percent value={30} />, label: "DP ditahan DuaCincin" },
  { head: <>Setelah acara</>, label: "Dana cair ke rekeningmu" },
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
              <dl className="mt-10 grid grid-cols-3 divide-x divide-[#e2d0aa] border-t border-[#e2d0aa] pt-5">
                {FACTS.map((f, i) => (
                  <div key={f.label} className={i === 0 ? "pr-3 sm:pr-6" : "px-3 sm:px-6"}>
                    <dd className="wd-display text-[1.35rem] leading-tight text-wd-accent-ink tabular-nums sm:text-[1.9rem]">{f.head}</dd>
                    <dt className="mt-1 text-[0.72rem] leading-snug text-wd-text sm:text-[0.85rem]">{f.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto h-[420px] w-full max-w-[420px] overflow-hidden pt-4 lg:col-span-5 lg:h-auto lg:max-w-none lg:self-stretch">
              <div className="absolute bottom-0 left-1/2 w-[230px] -translate-x-1/2 translate-y-[12%] sm:w-[250px]">
                <PhoneFrame src="/showcase/vendordash-phone.webp" alt="Dashboard vendor di ponsel: permintaan baru dan acara terdekat" sizes="250px" surface="dark" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
