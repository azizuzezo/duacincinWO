"use client";

import { motion } from "framer-motion";

import type { BookingStatus, Meeting } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

/** Whose words the step copy uses. "neutral" (default) names both sides, so
 * a page that only passes `status` reads correctly for any role. */
export type StepperPerspective = "client" | "vendor" | "neutral";

type Money = "none" | "held_dp" | "held_full" | "released";

type StepDef = {
  key: string;
  title: string;
  optional?: boolean;
  money: Money;
  who: Record<StepperPerspective, string>;
};

// The 7 steps of PRD §8.11, each saying who acts and where the money is.
const STEPS: StepDef[] = [
  {
    key: "requested",
    title: "Booking diajukan",
    money: "none",
    who: {
      client: "Kamu mengajukan tanggal, paket, dan harga hasil diskusi.",
      vendor: "Client mengajukan tanggal, paket, dan harga hasil diskusi.",
      neutral: "Calon pengantin mengajukan tanggal, paket, dan harga.",
    },
  },
  {
    key: "confirmed",
    title: "Vendor mengonfirmasi",
    money: "none",
    who: {
      client: "Vendor memeriksa jadwalnya lalu mengonfirmasi booking.",
      vendor: "Kamu memeriksa jadwal lalu mengonfirmasi booking.",
      neutral: "Vendor memeriksa jadwal lalu mengonfirmasi booking.",
    },
  },
  {
    key: "dp",
    title: "Bayar DP 30%",
    money: "held_dp",
    who: {
      client: "Kamu membayar DP lewat DuaCincin. Tanggal vendor terkunci untukmu.",
      vendor: "Client membayar DP lewat DuaCincin. Tanggalmu terkunci untuk client ini.",
      neutral: "Calon pengantin membayar DP lewat DuaCincin. Tanggal vendor terkunci.",
    },
  },
  {
    key: "consult",
    title: "Meeting dengan konsultan",
    optional: true,
    money: "held_dp",
    who: {
      client: "Bila perlu, jadwalkan sesi dengan Wedding Consultant, misalnya untuk meninjau anggaran.",
      vendor: "Sesi antara client dan Wedding Consultant, bila client memintanya.",
      neutral: "Sesi dengan Wedding Consultant, bila calon pengantin memintanya.",
    },
  },
  {
    key: "full",
    title: "Pelunasan",
    money: "held_full",
    who: {
      client: "Kamu melunasi sisa pembayaran lewat DuaCincin.",
      vendor: "Client melunasi sisa pembayaran lewat DuaCincin.",
      neutral: "Calon pengantin melunasi sisa pembayaran.",
    },
  },
  {
    key: "tech",
    title: "Technical meeting",
    money: "held_full",
    who: {
      client: "Kamu, vendor, dan konsultan (bila diminta) menyepakati rundown, denah, dan jadwal kru.",
      vendor: "Kamu, client, dan konsultan (bila diminta) menyepakati rundown, denah, dan jadwal kru.",
      neutral: "Calon pengantin, vendor, dan konsultan menyepakati rundown dan jadwal kru.",
    },
  },
  {
    key: "done",
    title: "Hari-H selesai",
    money: "released",
    who: {
      client: "Setelah kamu mengonfirmasi acara selesai, dana diteruskan ke vendor.",
      vendor: "Setelah client mengonfirmasi acara selesai, dana diteruskan kepadamu dikurangi komisi.",
      neutral: "Setelah acara dikonfirmasi selesai, dana diteruskan ke vendor.",
    },
  },
];

const MONEY_LABEL: Record<Money, string> = {
  none: "Belum ada pembayaran",
  held_dp: "DP ditahan escrow",
  held_full: "Seluruh dana ditahan escrow",
  released: "Dana diteruskan ke vendor",
};

const RANK: Record<BookingStatus, number> = { requested: 0, confirmed: 1, dp_paid: 2, full_paid: 3, completed: 4, cancelled: -1 };

type StepState = "done" | "current" | "upcoming" | "optional";

function stepStates(status: BookingStatus, meetings?: Meeting[]): StepState[] {
  const rank = RANK[status];
  const hasTech = meetings?.some((m) => m.type === "technical_meeting") ?? false;
  const hasConsult = meetings?.some((m) => m.type === "consultant_meeting") ?? false;
  const done = [
    rank >= 0,
    rank >= 1,
    rank >= 2,
    hasConsult,
    rank >= 3,
    rank >= 4 || (rank === 3 && hasTech),
    rank >= 4,
  ];
  let currentSet = false;
  return STEPS.map((s, i) => {
    if (done[i]) return "done";
    if (s.optional) return "optional";
    if (!currentSet && rank >= 0) {
      currentSet = true;
      return "current";
    }
    return "upcoming";
  });
}

/** Where a booking is on the 7-step journey, for compact progress on cards. */
export function bookingProgress(status: BookingStatus, meetings?: Meeting[]): { step: number; total: number; title: string } {
  const states = stepStates(status, meetings);
  const i = states.indexOf("current");
  if (status === "completed") return { step: STEPS.length, total: STEPS.length, title: STEPS[STEPS.length - 1].title };
  const idx = i === -1 ? 0 : i;
  return { step: idx + 1, total: STEPS.length, title: STEPS[idx].title };
}

function Node({ state, n }: { state: StepState; n: number }) {
  if (state === "done") {
    return (
      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-dc-gold text-dc-ink">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-dc-ink text-sm font-semibold tabular-nums text-dc-on-dark ring-4 ring-dc-gold/30">
        {n}
      </span>
    );
  }
  return (
    <span
      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-dc-white text-sm font-semibold tabular-nums text-dc-text-3 ${
        state === "optional" ? "border-dashed border-dc-line-strong" : "border-dc-line-strong"
      }`}
    >
      {n}
    </span>
  );
}

function MoneyTag({ money, muted }: { money: Money; muted: boolean }) {
  const dot = money === "none" ? "border border-dc-line-strong" : money === "released" ? "bg-dc-success" : "bg-dc-gold";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${muted ? "text-dc-text-3" : "text-dc-text-2"}`}>
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="sr-only">Posisi dana: </span>
      {MONEY_LABEL[money]}
    </span>
  );
}

/** The booking journey as a vertical timeline (PRD §8.11): seven steps, each
 * saying who acts and where the money sits. Done steps are gold with a check,
 * the current step is ink with a soft gold halo and a "Sekarang" label, the
 * optional consultant step has a dashed node. State is always written in text
 * so it never depends on color. Pass `meetings` from the booking so the
 * technical meeting step can tick; `perspective` switches "Kamu" copy. */
export function BookingStepper({
  status,
  meetings,
  perspective = "neutral",
}: {
  status: BookingStatus;
  meetings?: Meeting[];
  perspective?: StepperPerspective;
}) {
  const reduced = useReducedMotion();
  if (status === "cancelled") {
    return <p className="text-sm text-dc-text-2">Booking ini dibatalkan, jadi tahapannya berhenti. Dana mengikuti ketentuan pembatalan.</p>;
  }

  const states = stepStates(status, meetings);

  return (
    <ol className="flex flex-col" aria-label="Tahap booking">
      {STEPS.map((step, i) => {
        const state = states[i];
        const last = i === STEPS.length - 1;
        const lineDone = state === "done" && (states[i + 1] === "done" || states[i + 1] === "current");
        return (
          <li key={step.key} aria-current={state === "current" ? "step" : undefined} className="relative flex gap-4">
            {!last && (
              <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-0.5 bg-dc-line">
                {/* Gold fills down the finished part of the journey, step by step, so progress reads as movement. */}
                {lineDone && (
                  <motion.span
                    className="absolute inset-0 origin-top bg-dc-gold"
                    initial={reduced ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.45, ease: EASE, delay: 0.15 + i * 0.12 }}
                  />
                )}
              </span>
            )}
            <Node state={state} n={i + 1} />
            <div
              className={`mb-3 min-w-0 flex-1 rounded-lg ${
                state === "current" ? "-mt-1 border border-dc-gold/40 bg-dc-cream/70 px-4 py-3" : "pb-3 pt-1"
              } ${last ? "mb-0" : ""}`}
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`font-semibold ${state === "upcoming" || state === "optional" ? "text-dc-text-2" : "text-dc-ink"}`}>
                  {step.title}
                </span>
                {state === "current" && (
                  <span className="rounded-full bg-dc-ink px-2 py-0.5 text-xs font-semibold text-dc-on-dark">Sekarang</span>
                )}
                {step.optional && <span className="text-xs font-medium text-dc-text-3">(opsional)</span>}
                {step.key === "tech" && state !== "done" && meetings?.some((m) => m.type === "technical_meeting") && (
                  <span className="rounded-full bg-dc-gold-soft px-2 py-0.5 text-xs font-semibold text-dc-clay">Sudah dijadwalkan</span>
                )}
                <span className="sr-only">
                  {state === "done" ? ", selesai" : state === "upcoming" ? ", belum" : state === "optional" ? ", bisa dilewati" : ""}
                </span>
              </p>
              {state !== "done" && <p className="mt-1 text-sm leading-relaxed text-dc-text-2">{step.who[perspective]}</p>}
              <div className="mt-1.5">
                <MoneyTag money={step.money} muted={state !== "current"} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
