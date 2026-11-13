// Gold gate ("gapura") drawn in SVG, inspired by a pelaminan arch: a two-tier
// gilded moulding round the opening, a kayon/gunungan crest at the keystone
// with the brand's two rings at its heart, sulur (vine) scrolls on the
// shoulders, carved capitals at the spring line and a stepped plinth that
// grounds it. Depth comes from a metallic gradient, a dark recess line and a
// highlight line, not from filters, so it stays light on phones.
//
// Two forms share one drawing:
// - <GoldArch>: the standalone ornament in the old 969 x 900 box, so every
//   existing layout keeps its size (auth, 404, RSVP, vendor page, planner).
// - <GoldArchFrame>: the gate with a 3:4 photo window cut into it. Children
//   render inside the window (same semicircle as the gate's opening), so the
//   photo and the gate read as one object. `shineKey` replays a single light
//   sweep over the gold when it changes (a new couple steps in); it never
//   loops and is off under prefers-reduced-motion.
// Decorative only: aria-hidden.

import type { CSSProperties, ReactNode } from "react";

import styles from "./GoldArch.module.css";

type Geo = { cx: number; r: number; apex: number; base: number; s: number };

const f = (n: number) => Math.round(n * 10) / 10;

/** Arch outline of radius `rad` from the base up, over the top, and down. */
function archPath(g: Geo, rad: number, bottom = g.base): string {
  const cy = g.apex + g.r;
  return `M ${f(g.cx - rad)} ${f(bottom)} V ${f(cy)} A ${f(rad)} ${f(rad)} 0 0 1 ${f(g.cx + rad)} ${f(cy)} V ${f(bottom)}`;
}

/** Closed ring between two radii (fill-rule evenodd). */
function ringPath(g: Geo, ri: number, ro: number): string {
  return `${archPath(g, ro)} Z ${archPath(g, ri)} Z`;
}

/** Map local scroll coordinates (u along the arc away from the crest, v outward) to the page. */
function onArc(g: Geo, phiDeg: number, radius: number, side: 1 | -1) {
  const cy = g.apex + g.r;
  const p = (phiDeg * Math.PI) / 180;
  const px = g.cx + side * radius * Math.cos(p);
  const py = cy - radius * Math.sin(p);
  const t = { x: side * Math.sin(p), y: Math.cos(p) };
  const n = { x: side * Math.cos(p), y: -Math.sin(p) };
  return (u: number, v: number) => `${f(px + u * t.x + v * n.x)} ${f(py + u * t.y + v * n.y)}`;
}

/** One sulur: a curling vine stroke plus a small leaf. */
function scroll(g: Geo, phiDeg: number, k: number, side: 1 | -1) {
  const m = onArc(g, phiDeg, g.r + 33 * g.s, side);
  const q = (u: number, v: number) => m(u * k * g.s, v * k * g.s);
  const vine = `M ${q(0, 0)} C ${q(2, 10)} ${q(10, 18)} ${q(22, 18)} C ${q(31, 18)} ${q(34, 9)} ${q(28, 5)} C ${q(23, 2)} ${q(19, 7)} ${q(22, 10)}`;
  const leaf = `M ${q(-2, 0)} C ${q(-9, 8)} ${q(-6, 18)} ${q(2, 23)} C ${q(3, 14)} ${q(1, 6)} ${q(-2, 0)} Z`;
  return { vine, leaf };
}

/** The kayon crest at the keystone, relative to the top of the band. */
function crest(g: Geo) {
  const y0 = g.apex - 24 * g.s;
  const P = (x: number, y: number) => `${f(g.cx + x * g.s)} ${f(y0 + y * g.s)}`;
  const outline = `M ${P(-44, 2)} C ${P(-58, -30)} ${P(-34, -62)} ${P(-14, -84)} C ${P(-6, -94)} ${P(-3, -104)} ${P(0, -116)} C ${P(3, -104)} ${P(6, -94)} ${P(14, -84)} C ${P(34, -62)} ${P(58, -30)} ${P(44, 2)} Z`;
  const inner = `M ${P(-33, -2)} C ${P(-44, -26)} ${P(-26, -50)} ${P(-11, -68)} C ${P(-5, -76)} ${P(-2, -84)} ${P(0, -94)} C ${P(2, -84)} ${P(5, -76)} ${P(11, -68)} C ${P(26, -50)} ${P(44, -26)} ${P(33, -2)}`;
  const stem = `M ${P(0, 0)} V ${f(y0 - 19 * g.s)} M ${P(0, -41)} V ${f(y0 - 100 * g.s)}`;
  const tendrils = [
    [-12, 1],
    [-56, 0.8],
    [-78, 0.55],
  ]
    .flatMap(([h, k]) =>
      ([1, -1] as const).map((sd) => {
        const T = (x: number, y: number) => P(sd * x * k, h + y * k);
        return `M ${T(0, 0)} C ${T(6, -2)} ${T(16, -6)} ${T(20, -16)} C ${T(22, -22)} ${T(17, -26)} ${T(13, -23)} C ${T(10, -21)} ${T(11, -17)} ${T(15, -17)}`;
      }),
    )
    .join(" ");
  return { outline, inner, stem, tendrils, ring: { y: y0 - 30 * g.s, dx: 7 * g.s, r: 9 * g.s }, finial: { x: g.cx, y: y0 - 122 * g.s, r: 3.2 * g.s } };
}

function Gate({ g, id, W, H, shineKey, plate = false }: { g: Geo; id: string; W: number; H: number; shineKey?: string; plate?: boolean }) {
  const { cx, r, apex, base, s } = g;
  const cy = apex + r;
  const ri = r - 1;
  const ro = r + 24 * s;
  const metal = `url(#${id}-metal)`;
  const c = crest(g);
  const scrolls = ([1, -1] as const).flatMap((sd) => [scroll(g, 76, 1.25, sd), scroll(g, 62, 1.05, sd), scroll(g, 49, 0.85, sd), scroll(g, 38, 0.62, sd)]);
  // Carved gadroons on the band: short radial cuts between the highlight and the groove.
  const gadroons: string[] = [];
  for (let d = 4; d < 180; d += 4.5) {
    const p = (d * Math.PI) / 180;
    const at = (rad: number) => `${f(cx + rad * Math.cos(p))} ${f(cy - rad * Math.sin(p))}`;
    gadroons.push(`M ${at(r + 6.5 * s)} L ${at(r + 12 * s)}`);
  }
  for (let y = cy + 9 * s; y < base - 22 * s; y += 9 * s) {
    for (const x of [cx - r - 6.5 * s, cx + r + 6.5 * s]) gadroons.push(`M ${f(x)} ${f(y)} H ${f(x + (x < cx ? -5.5 : 5.5) * s)}`);
  }
  const imposts = ([1, -1] as const).map((sd) => {
    const x0 = sd === -1 ? cx - r - 40 * s : cx + r - 2 * s;
    const x1 = sd === -1 ? cx - r + 2 * s : cx + r + 40 * s;
    return { x: f(x0), w: f(x1 - x0), sd };
  });
  const band = ringPath(g, ri, ro);

  return (
    <>
      <defs>
        <linearGradient id={`${id}-metal`} gradientUnits="userSpaceOnUse" x1={cx - ro} y1={apex - 140 * s} x2={cx + ro} y2={base}>
          <stop offset="0" stopColor="#f8e7b9" />
          <stop offset="0.15" stopColor="#e2c27f" />
          <stop offset="0.3" stopColor="#a98035" />
          <stop offset="0.45" stopColor="#f0d89c" />
          <stop offset="0.6" stopColor="#c39c52" />
          <stop offset="0.78" stopColor="#7f6028" />
          <stop offset="0.9" stopColor="#d9b871" />
          <stop offset="1" stopColor="#9c7631" />
        </linearGradient>
        <radialGradient id={`${id}-floor`}>
          <stop offset="0" stopColor="#0e0a07" stopOpacity="0.75" />
          <stop offset="1" stopColor="#0e0a07" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff6dc" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-gold`}>
          <path d={band} clipRule="evenodd" />
          <path d={c.outline} />
        </clipPath>
      </defs>

      {/* Ground shadow, so the gate stands on the scene instead of floating. */}
      <ellipse cx={cx} cy={base + 18 * s} rx={r + 100 * s} ry={22 * s} fill={`url(#${id}-floor)`} />

      {/* Dark lacquer backing (frame only): sits under the band, the shoulders
          and the crest so the gold reads against any backdrop photo instead of
          melting into warm walls and roofs. */}
      {plate && (
        <g fill="#120c07">
          <path d={ringPath(g, r - 2 * s, r + 46 * s)} fillRule="evenodd" fillOpacity="0.86" />
          <path d={c.outline} fillOpacity="0.92" />
        </g>
      )}

      {/* Kayon crest with the two rings at its heart. */}
      <path d={c.outline} fill={metal} fillOpacity={plate ? 0.1 : 0.16} stroke={metal} strokeWidth={2.4 * s} strokeLinejoin="round" />
      <path d={c.inner} stroke={metal} strokeWidth={1.1 * s} opacity="0.75" />
      <path d={c.stem} stroke={metal} strokeWidth={1.4 * s} strokeLinecap="round" />
      <path d={c.tendrils} stroke={metal} strokeWidth={1.5 * s} strokeLinecap="round" />
      <g stroke={metal} strokeWidth={2.2 * s}>
        <circle cx={cx - c.ring.dx} cy={c.ring.y} r={c.ring.r} />
        <circle cx={cx + c.ring.dx} cy={c.ring.y} r={c.ring.r} />
      </g>
      <circle cx={c.finial.x} cy={c.finial.y} r={c.finial.r} fill={metal} />

      {/* Sulur scrolls on the shoulders, growing from the outer hairline. */}
      <g stroke={metal} strokeWidth={1.6 * s} strokeLinecap="round">
        {scrolls.map((sc, i) => (
          <path key={`v${i}`} d={sc.vine} />
        ))}
      </g>
      <g fill={metal}>
        {scrolls.map((sc, i) => (
          <path key={`l${i}`} d={sc.leaf} />
        ))}
      </g>

      {/* Outer hairline, then the gilded band with a groove, a recess and a highlight. */}
      <path d={archPath(g, r + 33 * s)} stroke={metal} strokeWidth={2 * s} />
      <path d={band} fill={metal} fillRule="evenodd" />
      {/* Moulding relief: a lit ridge and a shaded channel that follow the arch and the posts. */}
      <path d={archPath(g, r + 8.5 * s)} stroke="#fff6dc" strokeOpacity="0.28" strokeWidth={6 * s} />
      <path d={archPath(g, r + 19 * s)} stroke="#4a3514" strokeOpacity="0.28" strokeWidth={6 * s} />
      <path d={gadroons.join(" ")} stroke="#5c431a" strokeOpacity="0.4" strokeWidth={1.1 * s} strokeLinecap="round" />
      <path d={archPath(g, r + 13.5 * s)} stroke="#5c431a" strokeOpacity="0.55" strokeWidth={1.2 * s} />
      <path d={archPath(g, r + 5 * s)} stroke="#fff3d1" strokeOpacity="0.55" strokeWidth={1 * s} />
      <path d={archPath(g, ro)} stroke="#5c431a" strokeOpacity="0.45" strokeWidth={1 * s} />
      <path d={archPath(g, r + 0.5 * s)} stroke="#140e09" strokeOpacity="0.65" strokeWidth={2.5 * s} />
      {/* Ivory fillet between photo and gold (frame only), a crisp inner edge. */}
      {plate && <path d={archPath(g, r + 2.2 * s)} stroke="#fbf1d6" strokeOpacity="0.9" strokeWidth={1.4 * s} />}

      {/* Carved capitals at the spring line and bases at the foot of each post. */}
      {imposts.map((im) => (
        <g key={im.sd} fill={metal} stroke="#5c431a" strokeOpacity="0.5" strokeWidth={0.8 * s}>
          <rect x={im.x + 5 * s} y={cy - 10 * s} width={im.w - 10 * s} height={6 * s} rx={1.5 * s} />
          <rect x={im.x} y={cy - 4 * s} width={im.w} height={12 * s} rx={2 * s} />
          <rect x={im.x + 2 * s} y={base - 18 * s} width={im.w - 4 * s} height={18 * s} rx={1.5 * s} />
        </g>
      ))}

      {/* Stepped plinth (the threshold the couple stands on). */}
      <rect x={cx - r - 46 * s} y={base - 1} width={2 * (r + 46 * s)} height={10 * s + 1} rx={2 * s} fill={metal} />
      <rect x={cx - r - 60 * s} y={base + 9 * s} width={2 * (r + 60 * s)} height={8 * s} rx={2 * s} fill={metal} opacity="0.7" />
      <path d={`M ${f(cx - r - 46 * s)} ${f(base + 9 * s)} H ${f(cx + r + 46 * s)}`} stroke="#5c431a" strokeOpacity="0.5" strokeWidth={1 * s} />

      {shineKey !== undefined && (
        <g clipPath={`url(#${id}-gold)`}>
          <g transform={`rotate(14 ${f(W / 2)} ${f(H / 2)})`}>
            <rect
              key={shineKey}
              className={styles.shine}
              style={{ "--dc-shine-x": `${f(W + 260 * s)}px` } as CSSProperties}
              x={-200 * s}
              y={-H * 0.25}
              width={150 * s}
              height={H * 1.5}
              fill={`url(#${id}-shine)`}
            />
          </g>
        </g>
      )}
    </>
  );
}

const A_W = 969;
const A_H = 900;
const A_GEO: Geo = { cx: A_W / 2, r: 300, apex: 232, base: 869, s: 1.5 };

/** Standalone gold gate ornament (969 x 900 box, open archway). */
export function GoldArch({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${A_W} ${A_H}`} width={A_W} height={A_H} className={className} fill="none">
      <Gate g={A_GEO} id="dc-gate-a" W={A_W} H={A_H} />
    </svg>
  );
}

const F_W = 580;
const F_H = 724;
const F_GEO: Geo = { cx: F_W / 2, r: 200, apex: 158, base: 158 + (400 * 4) / 3, s: 1 };
const pct = (n: number, d: number) => `${(n / d) * 100}%`;

/** Gold gate with a 3:4 arch window; children fill the window. Size it by height (h-full w-auto) or width. */
export function GoldArchFrame({ className = "", children, shineKey }: { className?: string; children: ReactNode; shineKey?: string }) {
  const g = F_GEO;
  return (
    <div className={`relative aspect-[580/724] ${className}`}>
      <div
        className={styles.window}
        style={{ left: pct(g.cx - g.r, F_W), top: pct(g.apex, F_H), width: pct(2 * g.r, F_W), height: pct(g.base - g.apex, F_H) }}
      >
        {children}
        <div className={styles.light} />
      </div>
      <svg aria-hidden viewBox={`0 0 ${F_W} ${F_H}`} className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${styles.gate}`} fill="none">
        <Gate g={g} id="dc-gate-f" W={F_W} H={F_H} shineKey={shineKey} plate />
      </svg>
    </div>
  );
}
