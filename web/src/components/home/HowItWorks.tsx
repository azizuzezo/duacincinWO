// "Tenang dari cari vendor sampai hari-H": four small benefit cards with cute
// icons (they have faces), a real product screen beside them, then the four
// booking steps as little illustrated windows (Bridestory-style "Cara
// membuat" panel). Everything stated here is product behaviour: vendors are
// reviewed by Admin before they appear, DP and balance are held in escrow
// until the couple confirms the event is done, chat history is kept.
// Motion: the small loops inside each illustration play only while that
// card is hovered or focused, and never under reduced motion.
import { Reveal } from "@/components/landing/Reveal";
import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { SectionHead } from "./ui";

const INK = "#231f1d";
const GOLD = "#dcbd80";
const GOLD_DEEP = "#b8924a";
const SOFT = "#f5ecd9";
const BLUSH = "#f5f0e8";
const LINE = "#e2d0aa";

/* ── Cute icons (rounded, a little face each) ── */
function IconShield() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
      <path d="M24 5 8 11v11c0 10 6.5 17.5 16 21 9.5-3.5 16-11 16-21V11L24 5Z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="19" cy="22" r="1.7" fill={INK} />
      <circle cx="29" cy="22" r="1.7" fill={INK} />
      <path d="M19 28c1.5 2 3 2.8 5 2.8s3.5-.8 5-2.8" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="26" r="2" fill="#fff" opacity=".55" />
      <circle cx="32" cy="26" r="2" fill="#fff" opacity=".55" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
      <rect x="6" y="13" width="36" height="26" rx="6" fill={SOFT} stroke={INK} strokeWidth="2" />
      <path d="M6 20h36" stroke={INK} strokeWidth="2" />
      <rect x="30" y="25" width="12" height="9" rx="4.5" fill={GOLD} stroke={INK} strokeWidth="2" />
      <circle cx="35" cy="29.5" r="1.5" fill={INK} />
      <circle cx="16" cy="28" r="1.5" fill={INK} />
      <circle cx="22" cy="28" r="1.5" fill={INK} />
      <path d="M16 32c1 1.4 2 1.9 3 1.9s2-.5 3-1.9" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
      <path d="M8 10h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22l-9 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="18" cy="22" r="1.7" fill={INK} />
      <circle cx="30" cy="22" r="1.7" fill={INK} />
      <path d="M19 27c1.5 2 3 2.6 5 2.6s3.5-.6 5-2.6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconPlanner() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
      <rect x="8" y="9" width="32" height="32" rx="6" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d="M8 18h32" stroke={INK} strokeWidth="2" />
      <path d="M17 6v6M31 6v6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="m15 28 3.2 3.2L24 25.5" fill="none" stroke={GOLD_DEEP} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 27h6M15 36h6M25 36h9" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

const BENEFITS = [
  { title: "Vendor diverifikasi", body: "Setiap vendor ditinjau tim DuaCincin sebelum tampil di direktori.", icon: <IconShield /> },
  { title: "Dana Aman", body: "DP dan pelunasan ditahan DuaCincin sampai kamu konfirmasi acara selesai.", icon: <IconWallet /> },
  { title: "Chat langsung", body: "Tanya tanggal, paket, dan harga. Riwayatnya tersimpan di akunmu.", icon: <IconChat /> },
  { title: "Sesuai budget", body: "Budget planner dan wedding consultant bantu pilih yang pas.", icon: <IconPlanner /> },
];

/* ── Step illustrations: a tiny browser window each ── */
function Window({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 160 112" aria-hidden className="h-auto w-full">
      <rect x="4" y="4" width="152" height="104" rx="10" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <path d="M4 14a10 10 0 0 1 10-10h132a10 10 0 0 1 10 10v8H4v-8Z" fill={BLUSH} />
      <circle cx="16" cy="13" r="2.2" fill={GOLD} />
      <circle cx="24" cy="13" r="2.2" fill={LINE} />
      <circle cx="32" cy="13" r="2.2" fill={LINE} />
      {children}
    </svg>
  );
}
function StepSearch() {
  return (
    <Window>
      <rect x="14" y="28" width="132" height="14" rx="7" fill={BLUSH} stroke={LINE} />
      <circle cx="25" cy="35" r="3.4" fill="none" stroke={INK} strokeWidth="1.4" />
      <path d="m27.6 37.6 2.6 2.6" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="34" y="33" width="46" height="4" rx="2" fill={LINE} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${14 + i * 45} 50)`}>
          <rect width="40" height="48" rx="6" fill={i === 1 ? SOFT : "#fff"} stroke={i === 1 ? GOLD : LINE} strokeWidth="1.4" />
          <rect x="4" y="4" width="32" height="24" rx="4" fill={BLUSH} />
          <circle cx="12" cy="13" r="3" fill={GOLD} opacity=".7" />
          <path d="m6 26 9-8 7 6 5-4 9 6" fill="none" stroke={LINE} strokeWidth="1.4" />
          <rect x="4" y="33" width="24" height="3.4" rx="1.7" fill={LINE} />
          <path d="m6 42.5 1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3Z" fill={GOLD} transform="scale(.8) translate(2 -2)" />
        </g>
      ))}
      <circle className="wd-anim wd-ripple" cx="79" cy="86" r="10" fill={GOLD} />
      <g className="wd-anim wd-tap">
        <path d="M84 84v-9a2.2 2.2 0 1 1 4.4 0v7l3-.7a2.2 2.2 0 0 1 2.6 2.6l-1.6 8.6a4 4 0 0 1-4 3.3h-5.6a4 4 0 0 1-3.3-1.7l-4-6a2.1 2.1 0 0 1 3.4-2.4l1.6 1.8" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </Window>
  );
}
function StepChat() {
  return (
    <Window>
      <rect x="14" y="30" width="62" height="18" rx="9" fill={BLUSH} stroke={LINE} />
      <rect x="22" y="36" width="40" height="3.4" rx="1.7" fill={LINE} />
      <rect x="22" y="42" width="26" height="3.4" rx="1.7" fill={LINE} />
      <rect x="84" y="52" width="62" height="18" rx="9" fill={GOLD} />
      <rect x="92" y="58" width="42" height="3.4" rx="1.7" fill="#fff" opacity=".85" />
      <rect x="92" y="64" width="24" height="3.4" rx="1.7" fill="#fff" opacity=".85" />
      <rect x="14" y="74" width="40" height="16" rx="8" fill={BLUSH} stroke={LINE} />
      <circle className="wd-anim wd-dot-1" cx="26" cy="82" r="2.2" fill={INK} />
      <circle className="wd-anim wd-dot-2" cx="34" cy="82" r="2.2" fill={INK} />
      <circle className="wd-anim wd-dot-3" cx="42" cy="82" r="2.2" fill={INK} />
      <rect x="80" y="88" width="66" height="14" rx="7" fill={INK} />
      <text x="113" y="97.6" textAnchor="middle" fontSize="6.6" fontWeight="700" fill="#fff" fontFamily="inherit">
        Ajukan booking
      </text>
    </Window>
  );
}
function StepEscrow() {
  return (
    <Window>
      <path d="M80 30 58 38v15c0 13 9 22 22 27 13-5 22-14 22-27V38l-22-8Z" fill={SOFT} stroke={GOLD_DEEP} strokeWidth="2" strokeLinejoin="round" />
      <path className="wd-anim wd-pop" d="m70 55 7 7 13-14" fill="none" stroke={GOLD_DEEP} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <g className="wd-anim wd-drop">
        <circle cx="80" cy="30" r="6.5" fill={GOLD} stroke={INK} strokeWidth="1.5" />
        <text x="80" y="32.8" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={INK} fontFamily="inherit">
          Rp
        </text>
      </g>
      <rect x="22" y="86" width="116" height="10" rx="5" fill={BLUSH} />
      <rect x="22" y="86" width="40" height="10" rx="5" fill={GOLD} />
      <text x="26" y="93.4" fontSize="6" fontWeight="700" fill={INK} fontFamily="inherit">
        DP 30%
      </text>
    </Window>
  );
}
function StepDone() {
  return (
    <Window>
      <rect x="18" y="34" width="46" height="56" rx="8" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <path d="M18 46h46" stroke={LINE} strokeWidth="1.5" />
      <path d="m29 66 6 6 11-12" fill="none" stroke={GOLD_DEEP} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="26" y="78" width="30" height="3.4" rx="1.7" fill={LINE} />
      <path d="M70 62h22" stroke={GOLD_DEEP} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" />
      <path d="m88 56 7 6-7 6" fill="none" stroke={GOLD_DEEP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M100 52h42l-3-12h-36l-3 12Zm2 0v38h38V52" fill={SOFT} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="112" y="68" width="18" height="22" rx="3" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <path className="wd-anim wd-pop" d="M121 30c-2-3-7-2-7 2 0 3 4 5 7 8 3-3 7-5 7-8 0-4-5-5-7-2Z" fill={GOLD} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    </Window>
  );
}

const STEPS = [
  { n: "01", art: <StepSearch />, text: "Cari dan bandingkan vendor, lalu buka profilnya." },
  { n: "02", art: <StepChat />, text: "Chat dengan vendor, sepakati tanggal dan paket, lalu ajukan booking." },
  { n: "03", art: <StepEscrow />, text: "Bayar DP lewat Dana Aman. Uang ditahan DuaCincin, belum sampai ke vendor." },
  { n: "04", art: <StepDone />, text: "Acara selesai, kamu konfirmasi, dana diteruskan ke vendor." },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="tenang-judul" className="relative overflow-hidden bg-white py-12 sm:py-16">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,#f5ecd9,transparent)]" />
      <div className="wd-container relative">
        <Reveal>
          <SectionHead id="tenang-judul" title="Tenang dari cari vendor sampai hari-H" sub="Empat hal yang membuat persiapanmu lebih ringan." />
        </Reveal>

        <Reveal className="mt-8">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ul className="dc-stagger grid gap-3 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <li key={b.title} className="group flex gap-4 rounded-[20px] bg-white p-5 shadow-wd-card ring-1 ring-wd-line transition-[transform,box-shadow] duration-300 hover:shadow-wd-lift motion-safe:hover:-translate-y-1">
                  <span className="h-14 w-14 shrink-0 rounded-2xl bg-wd-accent-soft p-2 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none">{b.icon}</span>
                  <span>
                    <span className="block text-[1.02rem] font-semibold text-wd-accent-ink">{b.title}</span>
                    <span className="mt-1 block text-[0.9rem] leading-relaxed text-wd-text">{b.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mx-auto hidden w-[230px] lg:block">
              <PhoneFrame src="/showcase/booking-phone.webp" alt="Layar booking DuaCincin dengan status Dana Aman" sizes="230px" />
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <h3 className="wd-title text-center text-[clamp(1.4rem,2.4vw,1.8rem)]">Cara booking di DuaCincin</h3>
          <span aria-hidden className="mx-auto mt-3 block h-0.5 w-10 rounded-full bg-wd-accent" />
          <ol className="dc-stagger mt-8 grid gap-x-6 gap-y-10 rounded-[28px] bg-white p-6 shadow-wd-card ring-1 ring-wd-line sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="group relative flex flex-col items-center text-center">
                <div className="w-full max-w-[210px] rounded-2xl p-1 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:-translate-y-1.5">{s.art}</div>
                <span className="mt-4 text-[1.05rem] font-semibold tabular-nums text-wd-accent-ink">{s.n}</span>
                <p className="mt-1.5 max-w-[26ch] text-[0.92rem] leading-relaxed text-wd-text">{s.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
