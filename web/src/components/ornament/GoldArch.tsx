// Gold wedding arch drawn in SVG: two gold lines with a string of melati
// (jasmine) beads along the curve, the gate a couple stands under. It replaced
// the floral-arch cutout so every picture on the site is a real, credited
// photo, and it keeps the brand's arch motif (the arch window in
// ConsultantBlock, the ring eyebrow).
// Same 969 x 900 box as the old cutout, so it drops into the same layouts.
// Decorative only: aria-hidden.

const W = 969;
const H = 900;
const CX = W / 2;
const R = 380; // outer radius of the arch top
const TOP = 70; // y of the outer apex
const CY = TOP + R; // centre of the top half-circle

/** Beads along the outer arch: up the left post, over the top, down the right. */
function beads(): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = [];
  const postStep = 46;
  for (let y = H - 30; y > CY; y -= postStep) out.push({ x: CX - R, y, r: 9 });
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n;
    out.push({ x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), r: i % 2 === 0 ? 11 : 8 });
  }
  for (let y = CY + postStep; y < H - 20; y += postStep) out.push({ x: CX + R, y, r: 9 });
  return out.map((b) => ({ x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, r: b.r }));
}

const BEADS = beads();

function archPath(r: number): string {
  return `M ${CX - r} ${H} L ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY} L ${CX + r} ${H}`;
}

export function GoldArch({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={className} fill="none">
      <defs>
        <linearGradient id="dc-arch-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d9a2" />
          <stop offset="0.45" stopColor="#c9a25a" />
          <stop offset="1" stopColor="#8f6c2c" />
        </linearGradient>
      </defs>
      <path d={archPath(R + 26)} stroke="url(#dc-arch-gold)" strokeWidth="3" opacity="0.7" />
      <path d={archPath(R)} stroke="url(#dc-arch-gold)" strokeWidth="12" strokeLinecap="round" />
      <path d={archPath(R - 30)} stroke="url(#dc-arch-gold)" strokeWidth="2.5" opacity="0.75" />
      {BEADS.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#fbf6ec" stroke="#c9a25a" strokeWidth="2.5" />
      ))}
      {/* Two rings at the keystone. */}
      <g stroke="url(#dc-arch-gold)" strokeWidth="6">
        <circle cx={CX - 17} cy={TOP} r="26" fill="none" />
        <circle cx={CX + 17} cy={TOP} r="26" fill="none" />
      </g>
    </svg>
  );
}
