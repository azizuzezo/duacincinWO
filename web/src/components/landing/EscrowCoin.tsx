"use client";

// Escrow as a real booking ledger. One example booking (the product's demo:
// rias pengantin Rp 18.500.000, DP 30%) moves through five stages; three
// parties (Kamu, Escrow DuaCincin, Vendor) show what each of them holds at
// that stage, and one gold coin sits where the money really is. As the block
// scrolls through the screen the booking advances stage by stage; tap a stage
// in the stepper to take over. The FundStatus in the ledger footer is the same
// component the app shows on every booking. Claims mirror PRD §8.5/§8.11
// (Midtrans into DuaCincin's holding account, released after the client
// confirms the event, minus platform commission).
//
// Motion purpose: the coin is the message (spring = physical weight, it moves
// only when the stage changes); the escrow balance counts to its new value so
// the change is seen. Reduced motion: no scroll-driven stepping (starts at
// "Bayar DP"), the coin appears at its party without travel, numbers jump.
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Counting } from "@/components/landing/Counting";
import { Reveal } from "@/components/landing/Reveal";
import { FundStatus } from "@/components/ui/FundStatus";
import type { BookingStatus } from "@/lib/api";
import { EASE, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";

type Station = 0 | 1 | 2;

const STAGES: { station: Station; status: BookingStatus; short: string; title: string; body: string }[] = [
  { station: 0, status: "requested", short: "Ajukan", title: "Booking diajukan", body: "Tanggal dan paket hasil chat kamu ajukan. Belum ada uang yang berpindah." },
  { station: 0, status: "confirmed", short: "Disetujui", title: "Vendor mengonfirmasi", body: "Tinggal bayar DP untuk mengunci tanggal." },
  { station: 1, status: "dp_paid", short: "Bayar DP", title: "DP masuk ke escrow", body: "Dibayar ke akun penampung DuaCincin, belum ke vendor." },
  { station: 1, status: "full_paid", short: "Pelunasan", title: "Pelunasan tetap ditahan", body: "Sampai hari-H, uangmu tetap di escrow." },
  { station: 2, status: "completed", short: "Selesai", title: "Kamu konfirmasi, dana diteruskan", body: "Setelah acara selesai, dana diteruskan ke vendor, dikurangi komisi platform." },
];

// The example booking (same numbers as the product's demo booking).
const TOTAL = 18_500_000;
const DP = 5_550_000; // 30%
const REST = TOTAL - DP; // 12.950.000

const rp = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(n))}`;

/** What each party holds at each stage. */
function ledger(stage: number) {
  return {
    clientLabel: stage === 1 ? "Tagihan DP" : "Sudah dibayar",
    client: stage === 0 ? 0 : stage === 1 ? DP : stage === 2 ? DP : TOTAL,
    escrow: stage === 2 ? DP : stage === 3 ? TOTAL : 0,
    vendor: stage === 4 ? TOTAL : 0,
  };
}

const GUARDS = [
  { title: "Bukti tercatat", body: "Chat dan booking tersimpan untuk rujukan bila ada sengketa." },
  { title: "Chat diawasi", body: "Nomor telepon dan tautan luar ditandai untuk ditinjau Admin." },
  { title: "Vendor terikat perjanjian", body: "Setiap vendor menyetujui Perjanjian Kemitraan." },
];

function Coin({ here, reduced }: { here: boolean; reduced: boolean | null }) {
  return (
    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center">
      {here && (
        <motion.span layoutId={reduced ? undefined : "escrow-coin"} transition={SPRING_SNAPPY} className="block">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3dc9f,#c39c52_55%,#8a682b)] shadow-[0_4px_12px_-4px_rgba(138,104,43,0.7)]">
            <span className="h-5 w-5 rounded-full border border-[#f6e6bd]/70" />
          </span>
        </motion.span>
      )}
    </span>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A thin vertical link between two parties, with the transfer it carries. */
function Flow({ active, label, meta }: { active: boolean; label: string; meta: string }) {
  return (
    <div className="flex items-stretch gap-3 pl-[2.1rem] sm:pl-[2.5rem]">
      <span aria-hidden className="relative w-px shrink-0">
        <span
          className={`absolute inset-0 transition-colors duration-500 ${
            active ? "bg-dc-gold" : "bg-[repeating-linear-gradient(180deg,var(--dc-line-strong)_0_4px,transparent_4px_8px)]"
          }`}
        />
        <svg viewBox="0 0 10 6" className={`absolute -bottom-1 left-1/2 h-1.5 w-2.5 -translate-x-1/2 ${active ? "text-dc-gold" : "text-dc-line-strong"}`}>
          <path d="M0 0l5 6 5-6z" fill="currentColor" />
        </svg>
      </span>
      <p className="py-3 pl-3 text-xs leading-snug">
        <span className={`block font-semibold ${active ? "text-dc-clay" : "text-dc-text-3"}`}>{label}</span>
        <span className="text-dc-text-3">{meta}</span>
      </p>
    </div>
  );
}

function Party({
  photo,
  name,
  role,
  amountLabel,
  amount,
  note,
  here,
  reduced,
}: {
  photo: string;
  name: string;
  role: string;
  amountLabel: string;
  amount: number;
  note?: string;
  here: boolean;
  reduced: boolean | null;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition-[border-color,background-color] duration-500 sm:gap-4 sm:p-4 ${
        here ? "border-dc-gold bg-dc-gold-wash" : "border-dc-line bg-dc-white"
      }`}
    >
      <Image src={photo} alt="" width={96} height={96} sizes="48px" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-dc-white sm:h-12 sm:w-12" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="font-heading text-xl leading-none text-dc-ink sm:text-[1.4rem]">{name}</p>
          <p className="mt-1 text-xs text-dc-text-3">{role}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-[0.7rem] font-semibold text-dc-text-3">{amountLabel}</p>
          <p className="text-sm font-bold tabular-nums text-dc-ink sm:text-base">
            <Counting value={amount} format={rp} />
          </p>
          {note && <p className="text-[0.7rem] text-dc-text-3">{note}</p>}
        </div>
      </div>
      <Coin here={here} reduced={reduced} />
    </div>
  );
}

export function EscrowCoin() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(2);
  const [touched, setTouched] = useState(false);
  // Animate the stage text only after the first change, so the server HTML
  // and the first client render match (and the text is visible without JS).
  const [changed, setChanged] = useState(false);
  const block = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: block, offset: ["start 0.75", "end 0.55"] });
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!mounted.current || touched || reduced) return;
    const n = Math.min(STAGES.length - 1, Math.max(0, Math.round(p * (STAGES.length - 1))));
    if (n !== stage) {
      setStage(n);
      setChanged(true);
    }
  });
  const s = STAGES[stage];
  const l = ledger(stage);

  function pick(n: number) {
    setTouched(true);
    setChanged(true);
    setStage(n);
  }

  return (
    <section id="alur-booking" aria-labelledby="escrow-judul" className="dc-grain relative scroll-mt-20 overflow-hidden bg-dc-ivory">
      <div className="dc-container py-20 sm:py-28 lg:py-32">
        <div ref={block} className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-x-16 lg:gap-y-10">
          {/* Heading */}
          <Reveal className="max-w-xl lg:col-start-1 lg:row-start-1">
            <p className="dc-eyebrow">Pembayaran escrow</p>
            <h2 id="escrow-judul" className="mt-4 font-heading text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02] text-dc-ink">
              Uangmu pindah tangan <span className="dc-em">setelah acara selesai.</span>
            </h2>
            <p className="mt-5 leading-relaxed text-dc-text-2">
              Contoh booking rias pengantin {rp(TOTAL)} dengan DP 30%. Pilih tahapnya, lalu lihat di mana uangmu berada.
            </p>
          </Reveal>

          {/* Ledger: three parties and the coin */}
          <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <span aria-hidden className="absolute -inset-3 -z-0 rounded-[2.4rem] border border-dc-line/70 sm:-inset-4" />
            <div className="relative rounded-2xl border border-dc-line bg-dc-white p-4 shadow-lift sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pb-4">
                <div>
                  <p className="text-xs font-semibold text-dc-text-3">Contoh booking</p>
                  <p className="font-heading text-[1.45rem] leading-tight text-dc-ink">Rias pengantin, paket akad</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-dc-text-3">Total</p>
                  <p className="font-bold tabular-nums text-dc-ink">{rp(TOTAL)}</p>
                </div>
              </div>
              <hr className="dc-rule mb-4" />

              <div aria-label="Posisi uangmu" role="group">
                <Party
                  photo="/photos/pasangan/pin-akad-sm.webp"
                  name="Kamu"
                  role="Calon pengantin"
                  amountLabel={l.clientLabel}
                  amount={l.client}
                  here={s.station === 0}
                  reduced={reduced}
                />

                <Flow
                  active={stage >= 2}
                  label={stage <= 1 ? "Belum ada transfer" : stage === 2 ? `DP 30% · ${rp(DP)}` : `Pelunasan · ${rp(REST)}`}
                  meta={stage <= 1 ? "DP dibayar setelah vendor setuju" : "Masuk ke akun penampung DuaCincin"}
                />

                {/* The vault */}
                <div
                  className={`relative overflow-hidden rounded-xl bg-dc-ink p-4 text-dc-on-dark transition-shadow duration-500 sm:p-5 ${
                    s.station === 1 ? "shadow-[0_18px_40px_-16px_rgba(138,104,43,0.55)]" : "shadow-soft"
                  }`}
                >
                  <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[14px] border border-dc-gold-antique/30" />
                  <svg aria-hidden viewBox="0 0 64 40" fill="none" className="pointer-events-none absolute -right-6 -top-6 h-32 w-48 text-dc-gold-antique/10">
                    <circle cx="24" cy="20" r="16" stroke="currentColor" strokeWidth="1" />
                    <circle cx="40" cy="20" r="16" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <div className="relative flex items-center gap-3 sm:gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dc-gold-antique/40 bg-dc-ink-2 sm:h-12 sm:w-12">
                      <Image src="/brand/duacincin-logo.webp" alt="" width={64} height={64} className="h-8 w-8 sm:h-9 sm:w-9" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-xl leading-none sm:text-[1.4rem]">Escrow DuaCincin</p>
                      <p className="mt-1 text-xs text-dc-on-dark/70">Akun penampung, bukan rekening vendor</p>
                    </div>
                    <Coin here={s.station === 1} reduced={reduced} />
                  </div>
                  <div className="relative mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-dc-ink-3 pt-3">
                    <p className="text-xs text-dc-on-dark/70">{stage === 4 ? "Sudah diteruskan ke vendor" : "Saldo ditahan"}</p>
                    <p className="font-heading text-[clamp(1.9rem,6vw,2.4rem)] leading-none text-dc-gold-antique [font-variant-numeric:lining-nums_tabular-nums]">
                      <Counting value={l.escrow} format={rp} />
                    </p>
                  </div>
                </div>

                <Flow
                  active={stage === 4}
                  label={stage === 4 ? "Diteruskan ke vendor" : "Ditahan sampai acara selesai"}
                  meta={stage === 4 ? "Setelah kamu konfirmasi acara selesai" : "Vendor belum menerima dana"}
                />

                <Party
                  photo="/photos/pinterest/rias-hijab-sm.webp"
                  name="Vendor"
                  role="Rias pengantin"
                  amountLabel="Diterima"
                  amount={l.vendor}
                  note={stage === 4 ? "dikurangi komisi platform" : undefined}
                  here={s.station === 2}
                  reduced={reduced}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-dc-cream px-4 py-3">
                <p className="text-xs text-dc-text-3">Status di aplikasi</p>
                <FundStatus status={s.status} compact />
              </div>
            </div>
          </div>

          {/* Stepper: tap a stage to take over from the scroll */}
          <div className="lg:col-start-1 lg:row-start-2">
            <ol aria-label="Tahap booking" className="relative">
              {STAGES.map((st, i) => {
                const done = i < stage;
                const now = i === stage;
                const last = i === STAGES.length - 1;
                return (
                  <li key={st.status} className="relative">
                    {!last && (
                      <span
                        aria-hidden
                        className={`absolute bottom-0 left-[2rem] top-12 w-px transition-colors duration-500 ${i < stage ? "bg-dc-gold" : "bg-dc-line-strong"}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => pick(i)}
                      aria-current={now ? "step" : undefined}
                      className={`group relative flex min-h-11 w-full items-start gap-4 rounded-xl border px-4 py-3 text-left transition-[background-color,border-color,box-shadow] duration-300 active:scale-[0.99] ${
                        now ? "border-dc-line bg-dc-white shadow-soft" : "border-transparent hover:bg-dc-white/60"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
                          done
                            ? "bg-dc-ink text-dc-gold-antique"
                            : now
                              ? "border-2 border-dc-gold bg-dc-gold-soft text-dc-clay"
                              : "border border-dc-line-strong bg-dc-ivory text-dc-text-3"
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-semibold ${now ? "text-dc-clay" : "text-dc-text-3"}`}>
                          {st.short}
                          {done && <span className="sr-only"> (selesai)</span>}
                        </span>
                        <span className={`block font-semibold leading-snug ${now || done ? "text-dc-ink" : "text-dc-text-2 group-hover:text-dc-ink"}`}>{st.title}</span>
                        {now && (
                          <motion.span
                            key={stage}
                            initial={changed && !reduced ? { opacity: 0, y: 6 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="mt-1 block text-sm leading-relaxed text-dc-text-2"
                          >
                            {st.body}
                          </motion.span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="sr-only" aria-live="polite">
              {`Tahap ${stage + 1} dari ${STAGES.length}: ${s.title}. ${s.body}`}
            </p>
          </div>
        </div>

        <Reveal>
          <ul className="dc-stagger mt-16 grid gap-4 sm:grid-cols-3 sm:gap-5 lg:mt-20">
            {GUARDS.map((g) => (
              <li key={g.title} className="rounded-xl border border-dc-line bg-dc-white/70 p-5 sm:p-6">
                <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-dc-gold-soft text-dc-clay">
                  <svg viewBox="0 0 26 16" fill="none" className="h-4 w-[26px]">
                    <circle cx="9" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="17" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                <p className="mt-4 font-heading text-[1.45rem] leading-tight text-dc-ink">{g.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-dc-text-2">{g.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center">
            <Link href="/cara-kerja" className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
              Cara kerja lengkap
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
