"use client";

// Sticky storytelling for the escrow flow. Left: where the money is, as three
// stations (kamu, escrow DuaCincin, vendor) with one gold coin. Right: the five
// real booking stages. As each stage scrolls into the middle of the screen the
// coin moves to that stage's station, so the reader sees the money wait in
// escrow until the event is done. Claims mirror the product (PRD §8.5/§8.11):
// payment through Midtrans into DuaCincin's holding account, released after the
// client confirms the event, minus the platform commission.
//
// Motion purpose: the coin is the only moving thing and it carries the
// message; the active stage number turns gold. Reduced motion: it jumps without travel.

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

type Station = 0 | 1 | 2;

const STAGES: { station: Station; fund: string; title: string; body: string }[] = [
  {
    station: 0,
    fund: "Belum ada pembayaran",
    title: "Pilih vendor dan diskusi",
    body: "Bandingkan portofolio, lalu bahas paket dan harga lewat chat di DuaCincin. Bingung memilih? Minta rekomendasi ke wedding consultant.",
  },
  {
    station: 0,
    fund: "Belum ada pembayaran",
    title: "Ajukan booking",
    body: "Tanggal, paket, dan harga hasil diskusi kamu ajukan ke vendor, lalu vendor mengonfirmasi.",
  },
  {
    station: 1,
    fund: "Ditahan escrow",
    title: "Bayar DP",
    body: "DP masuk ke akun penampung DuaCincin lewat Midtrans, belum ke rekening vendor. Tanggalmu terkunci untukmu.",
  },
  {
    station: 1,
    fund: "Ditahan escrow",
    title: "Pelunasan dan technical meeting",
    body: "Setelah pelunasan, kamu, vendor, dan konsultan (bila diminta) menyepakati rundown, denah, dan jadwal kru sebelum hari-H.",
  },
  {
    station: 2,
    fund: "Diteruskan ke vendor",
    title: "Hari-H selesai",
    body: "Kamu mengonfirmasi acara selesai. Baru setelah itu dana diteruskan ke vendor, dikurangi komisi platform.",
  },
];

const STATIONS = [
  { label: "Kamu", sub: "Belum ada dana yang berpindah" },
  { label: "Escrow DuaCincin", sub: "Dana ditahan, vendor belum menerima" },
  { label: "Vendor", sub: "Setelah kamu konfirmasi acara selesai" },
];

function Vault({ station }: { station: Station }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative rounded-2xl border border-dc-line bg-dc-white p-6 shadow-soft sm:p-7">
      <p className="text-sm font-semibold text-dc-text-2">Posisi uangmu</p>
      <ol className="relative mt-5 flex flex-col gap-7">
        <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-px bg-[repeating-linear-gradient(180deg,var(--dc-line-strong)_0_6px,transparent_6px_12px)]" />
        {STATIONS.map((s, i) => {
          const here = i === station;
          return (
            <li key={s.label} className="relative flex items-center gap-4" aria-current={here ? "step" : undefined}>
              <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${here ? "border-dc-gold bg-dc-cream" : "border-dc-line-strong bg-dc-white"}`}>
                {here && (
                  <motion.span
                    layoutId={reduced ? undefined : "escrow-coin"}
                    transition={SPRING_SNAPPY}
                    aria-hidden
                    className="h-6 w-6 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3dc9f,#c39c52_55%,#8a682b)] shadow-gold"
                  />
                )}
              </span>
              <span>
                <span className={`block font-heading text-2xl leading-tight transition-colors ${here ? "text-dc-ink" : "text-dc-text-3"}`}>{s.label}</span>
                <span className="block text-sm text-dc-text-3">{s.sub}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function EscrowStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="alur-booking" aria-labelledby="escrow-judul" className="scroll-mt-20 bg-dc-cream">
      <div className="dc-container grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16 lg:py-36">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <p className="dc-eyebrow">Pembayaran escrow</p>
            <h2 id="escrow-judul" className="mt-4 font-heading text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02] text-dc-ink">
              Uangmu baru pindah tangan <span className="dc-em">setelah acaramu selesai.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-dc-text-2">
              Dari chat pertama sampai hari-H, setiap tahap tercatat. Ikuti koin emasnya: di situlah uangmu berada.
            </p>
            <div className="mt-8">
              <Vault station={STAGES[active].station} />
            </div>
          </div>
        </div>

        <ol className="lg:col-span-7 lg:pt-4">
          {/* Each stage reveals as it arrives (Reveal per item), then the coin follows. */}
          {STAGES.map((s, i) => {
            const on = i === active;
            return (
              <li
                key={s.title}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-i={i}
                className={`relative grid gap-3 border-t border-dc-line-strong py-9 sm:grid-cols-[4rem_1fr] sm:gap-6 lg:py-14`}
              >
                <span className={`font-heading text-5xl leading-none transition-colors duration-500 [font-variant-numeric:lining-nums] ${on ? "text-dc-gold" : "text-dc-line-strong"}`} aria-hidden>
                  {i + 1}
                </span>
                <Reveal>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      s.station === 0 ? "bg-dc-white text-dc-text-2" : s.station === 1 ? "bg-dc-gold/15 text-dc-clay" : "bg-dc-success/10 text-dc-success"
                    }`}
                  >
                    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${s.station === 0 ? "bg-dc-text-3" : s.station === 1 ? "bg-dc-gold" : "bg-dc-success"}`} />
                    {s.fund}
                  </span>
                  <h3 className="mt-3 font-heading text-[2.1rem] leading-tight text-dc-ink">{s.title}</h3>
                  <p className="mt-2 max-w-xl leading-relaxed text-dc-text-2">{s.body}</p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
