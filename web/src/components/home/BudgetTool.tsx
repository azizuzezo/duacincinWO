"use client";

// "Hitung budget": a live, playful budget split. Same categories, default
// shares and rescale rule as the real Budget Planner in the couple's account
// (lib/budget.ts, PRD §8.8): moving one slider rescales the others so the
// total stays 100%. A donut shows the split with a little piggy bank in the
// middle that hops whenever something changes, and says (in a speech bubble)
// only facts about the split: the biggest share and what it is in rupiah.
// Nothing is saved here; "Simpan di akunmu" leads to sign-up, where the real
// planner lives. Motion (hop, blink, wiggle) stops under reduced motion.
import Link from "next/link";
import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { BUDGET_CATEGORIES, defaultCategoryState, rescale, type BudgetCategoryKey } from "@/lib/budget";

import { SectionHead, wdButton } from "./ui";

// Gold-and-neutral series: distinct in lightness, each labelled in text too.
const COLORS: Record<BudgetCategoryKey, string> = {
  venue_catering: "#85662b",
  decor: "#c9a45c",
  photo_video: "#4b4542",
  mua_attire: "#e2c992",
  entertainment: "#8a7f76",
  invitation_souvenir: "#b99a74",
  reserve: "#d8cfc6",
};

const INK = "#231f1d";

/** Small cute icons, one per budget category (stroke icons with a touch of fill). */
const ICONS: Record<BudgetCategoryKey, ReactNode> = {
  venue_catering: (
    <>
      <path d="M5 21V11l7-6 7 6v10H5Z" fill="#f5ecd9" />
      <path d="M10 21v-6h4v6" />
      <circle cx="12" cy="10.5" r="1.2" fill={INK} stroke="none" />
    </>
  ),
  decor: (
    <>
      <circle cx="12" cy="9" r="2.2" fill="#dcbd80" />
      <path d="M12 6.8c0-2 3.6-2 3.6 0.6M14.2 9c2 0 2 3.6-.6 3.6M12 11.2c0 2-3.6 2-3.6-.6M9.8 9c-2 0-2-3.6.6-3.6" fill="#f5ecd9" />
      <path d="M12 12.5V21M12 17c-2-.2-3.4-1-4-2.6 2 0 3.5.6 4 2.6Z" />
    </>
  ),
  photo_video: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" fill="#f5ecd9" />
      <path d="M9 8l1.2-2h3.6L15 8" />
      <circle cx="12" cy="13.5" r="3" fill="#dcbd80" />
      <circle cx="17" cy="11" r=".8" fill={INK} stroke="none" />
    </>
  ),
  mua_attire: (
    <>
      <path d="M9 21v-7h6v7" fill="#f5ecd9" />
      <rect x="9.5" y="9" width="5" height="5" fill="#dcbd80" />
      <path d="M10 9c0-2 1-4 2-5 1 1 2 3 2 5" />
    </>
  ),
  entertainment: (
    <>
      <path d="M9 17V6l9-2v11" />
      <circle cx="7" cy="17" r="2.4" fill="#dcbd80" />
      <circle cx="16" cy="15" r="2.4" fill="#f5ecd9" />
    </>
  ),
  invitation_souvenir: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2.4" fill="#f5ecd9" />
      <path d="m4.6 7 7.4 6 7.4-6" />
      <path d="M12 16.6c-1.2-.8-1.8-1.6-1.8-2.4 0-.7.5-1.1 1-1.1s.8.3.8.3.3-.3.8-.3 1 .4 1 1.1c0 .8-.6 1.6-1.8 2.4Z" fill="#dcbd80" stroke="none" />
    </>
  ),
  reserve: (
    <>
      <ellipse cx="12" cy="13.5" rx="7.5" ry="5.5" fill="#f5ecd9" />
      <path d="M8 9.5 7 6.5l3 1.4M19.5 12.5c1.2.4 1.5 1.6.8 2.5" />
      <circle cx="9.5" cy="12.5" r=".9" fill={INK} stroke="none" />
      <path d="M10 8.8h4" strokeWidth="1.8" />
      <path d="M8.5 18.5V21M15.5 18.5V21" />
    </>
  ),
};

const PRESETS = [50, 100, 200, 350];
const MIN = 20;
const MAX = 1000;
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** A little piggy bank, front view, with a blinking face. `hop` re-keys to replay the hop. */
function Piggy({ hop }: { hop: number }) {
  return (
    <g key={hop} className="wd-hop">
      <path d="M-15 -17 -20 -27l11 5Z" fill="#dcbd80" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 -17 20 -27l-11 5Z" fill="#dcbd80" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <ellipse cx="0" cy="0" rx="26" ry="23" fill="#dcbd80" stroke={INK} strokeWidth="2" />
      <ellipse cx="0" cy="-20" rx="8" ry="2.4" fill={INK} />
      <rect x="-9" y="3" width="18" height="12" rx="6" fill="#f5ecd9" stroke={INK} strokeWidth="1.8" />
      <circle cx="-3.2" cy="9" r="1.2" fill={INK} />
      <circle cx="3.2" cy="9" r="1.2" fill={INK} />
      <g className="wd-blink">
        <circle cx="-13" cy="-6" r="2.3" fill={INK} />
        <circle cx="13" cy="-6" r="2.3" fill={INK} />
      </g>
      <circle cx="-19" cy="3" r="3.2" fill="#fff" opacity=".55" />
      <circle cx="19" cy="3" r="3.2" fill="#fff" opacity=".55" />
      <path d="M-14 21v6M14 21v6" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
    </g>
  );
}

function Donut({ split, hop }: { split: { category: BudgetCategoryKey; percentage: number }[]; hop: number }) {
  // Where each segment starts: the sum of the shares before it.
  const offsets = split.map((_, i) => split.slice(0, i).reduce((a, c) => a + c.percentage, 0));
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label="Diagram pembagian budget" className="mx-auto h-auto w-full max-w-[250px]">
      <circle cx="100" cy="100" r="78" fill="none" stroke="#f1e7d2" strokeWidth="26" />
      <g transform="rotate(-90 100 100)">
        {split.map((c, i) => {
          const len = Math.max(c.percentage - 0.6, 0);
          return (
            <circle
              key={c.category}
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke={COLORS[c.category]}
              strokeWidth="26"
              pathLength={100}
              style={{ strokeDasharray: `${len} ${100 - len}`, strokeDashoffset: -offsets[i], transition: "stroke-dasharray .35s ease, stroke-dashoffset .35s ease" } as CSSProperties}
            />
          );
        })}
      </g>
      <g transform="translate(100 104) scale(1.05)">
        <Piggy hop={hop} />
      </g>
    </svg>
  );
}

export function BudgetTool() {
  const id = useId();
  const [total, setTotal] = useState(150); // juta
  const [split, setSplit] = useState(defaultCategoryState);
  const [hop, setHop] = useState(0);

  const amount = (pct: number) => rupiah.format(Math.round((total * 1_000_000 * pct) / 100 / 100_000) * 100_000);
  const top = useMemo(() => [...split].sort((a, b) => b.percentage - a.percentage)[0], [split]);
  const topMeta = BUDGET_CATEGORIES.find((b) => b.key === top.category)!;

  return (
    <section id="budget" aria-labelledby="budget-judul" className="scroll-mt-36 bg-white py-14 sm:py-20">
      <div className="wd-container">
        <Reveal>
          <SectionHead
            id="budget-judul"
            title={
              <>
                Hitung budget pernikahanmu <em>dalam semenit</em>
              </>
            }
            sub="Pembagian awalnya sama dengan budget planner di akunmu. Geser untuk menyesuaikan."
          />
        </Reveal>

        <Reveal className="mt-8">
          <div className="grid gap-8 rounded-[28px] border border-wd-line bg-[linear-gradient(135deg,#fffdf9_0%,#fbf7ef_55%,#f5ecd9_100%)] p-5 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:p-10">
            {/* Total, mascot and donut */}
            <div>
              <label htmlFor={`${id}-total`} className="text-sm font-semibold text-wd-ink">
                Total budget
              </label>
              <p className="mt-2 text-[clamp(2rem,4vw,2.8rem)] font-semibold leading-none tracking-tight text-wd-ink tabular-nums" aria-live="polite">
                {rupiah.format(total * 1_000_000)}
              </p>
              <input
                id={`${id}-total`}
                type="range"
                min={MIN}
                max={MAX}
                step={5}
                value={total}
                onChange={(e) => {
                  setTotal(Number(e.target.value));
                  setHop((h) => h + 1);
                }}
                aria-valuetext={`${total} juta rupiah`}
                className="wd-range mt-4"
                style={{ "--p": `${((total - MIN) / (MAX - MIN)) * 100}%`, "--fill": "#85662b" } as CSSProperties}
              />
              <div className="flex justify-between text-xs text-wd-muted">
                <span>Rp20 juta</span>
                <span>Rp1 miliar</span>
              </div>
              <div role="group" aria-label="Pilih cepat" className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={total === p}
                    onClick={() => {
                      setTotal(p);
                      setHop((h) => h + 1);
                    }}
                    className="inline-flex min-h-10 items-center rounded-full border border-wd-accent-line bg-white px-4 text-sm font-medium text-wd-accent-ink transition-colors hover:bg-wd-accent-wash aria-pressed:border-wd-accent aria-pressed:bg-wd-accent aria-pressed:text-wd-ink"
                  >
                    {p} juta
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="w-[210px] shrink-0">
                  <Donut split={split} hop={hop} />
                </div>
                {/* The piggy's speech bubble: facts about the split only. */}
                <p role="status" className="relative rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-[0.92rem] leading-snug text-wd-ink shadow-wd-card ring-1 ring-wd-line sm:max-w-[240px]">
                  Paling besar: <strong>{topMeta.label}</strong>, {Math.round(top.percentage)}% atau <strong className="tabular-nums">{amount(top.percentage)}</strong>.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register?role=client" className={wdButton()}>
                  Simpan di akunmu
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSplit(defaultCategoryState());
                    setHop((h) => h + 1);
                  }}
                  className={wdButton({ variant: "outline" })}
                >
                  Atur ulang
                </button>
              </div>
            </div>

            {/* Per category */}
            <ul className="flex flex-col gap-1">
              {split.map((c) => {
                const meta = BUDGET_CATEGORIES.find((b) => b.key === c.category)!;
                const target = meta.vendorCategories?.[0];
                const sid = `${id}-${c.category}`;
                const pct = Math.round(c.percentage);
                return (
                  <li key={c.category} className="group rounded-2xl px-3 py-2.5 transition-colors hover:bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor={sid} className="flex items-center gap-3 text-[0.95rem] font-medium text-wd-ink">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wd-accent-soft transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            {ICONS[c.category]}
                          </svg>
                        </span>
                        <span>
                          {meta.label}
                          <span aria-hidden className="ml-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: COLORS[c.category] }} />
                        </span>
                      </label>
                      <span className="text-right text-sm tabular-nums">
                        <span className="font-semibold text-wd-ink">{amount(c.percentage)}</span>
                        <span className="ml-2 text-wd-muted">{pct}%</span>
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 pl-12">
                      <input
                        id={sid}
                        type="range"
                        min={0}
                        max={70}
                        step={1}
                        value={pct}
                        onChange={(e) => {
                          setSplit((s) => rescale(s, c.category, Number(e.target.value)));
                          setHop((h) => h + 1);
                        }}
                        aria-valuetext={`${pct} persen, ${amount(c.percentage)}`}
                        className="wd-range flex-1"
                        style={{ "--p": `${(pct / 70) * 100}%`, "--fill": COLORS[c.category] } as CSSProperties}
                      />
                      {target && c.category !== "reserve" && (
                        <Link href={`/kategori/${target}`} className="-my-2 inline-flex min-h-11 shrink-0 items-center px-1 text-xs font-semibold text-wd-accent-ink underline-offset-4 hover:underline">
                          Cari vendor
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
