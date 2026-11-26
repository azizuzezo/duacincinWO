// Illustrated characters for the client area: one object per wedding category,
// each with a face, drawn in the brand's ink outline, gold and cream. Used on
// the empty slots of the dashboard and the planning tiles.
import type { ReactNode } from "react";

const INK = "#231f1d";
const GOLD = "#dcbd80";
const DEEP = "#b98b2e";
const CREAM = "#f5ecd9";

const Face = ({ x = 24, y = 26, s = 1 }: { x?: number; y?: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="-5" cy="0" r="1.8" fill={INK} />
    <circle cx="5" cy="0" r="1.8" fill={INK} />
    <path d="M-5 5c1.6 2 3.2 2.8 5 2.8s3.4-.8 5-2.8" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  </g>
);

export type ArtKind = "hall" | "flower" | "camera" | "mirror" | "mic" | "card" | "coin" | "clipboard" | "envelope" | "bubble" | "people" | "frame" | "shop";

const ART: Record<ArtKind, ReactNode> = {
  hall: (
    <>
      <path d="M4 20 24 6l20 14Z" fill={DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="8" y="20" width="32" height="22" rx="2" fill={CREAM} stroke={INK} strokeWidth="2" />
      <path d="M19 42V31a5 5 0 0 1 10 0v11" fill={GOLD} stroke={INK} strokeWidth="2" />
      <circle cx="14" cy="27" r="2" fill={GOLD} stroke={INK} strokeWidth="1.4" />
      <circle cx="34" cy="27" r="2" fill={GOLD} stroke={INK} strokeWidth="1.4" />
    </>
  ),
  flower: (
    <>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="24" cy="12" rx="7" ry="9" fill={r % 144 ? CREAM : GOLD} stroke={INK} strokeWidth="2" transform={`rotate(${r} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="9" fill={DEEP} stroke={INK} strokeWidth="2" />
      <Face y={23} s={0.8} />
    </>
  ),
  camera: (
    <>
      <path d="M6 15h8l3-5h14l3 5h8a2 2 0 0 1 2 2v21a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V17a2 2 0 0 1 2-2Z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="24" cy="27" r="9.5" fill="#fff" stroke={INK} strokeWidth="2" />
      <Face y={26} s={0.75} />
    </>
  ),
  mirror: (
    <>
      <rect x="21" y="30" width="6" height="14" rx="3" fill={DEEP} stroke={INK} strokeWidth="2" />
      <ellipse cx="24" cy="18" rx="14" ry="15" fill={GOLD} stroke={INK} strokeWidth="2" />
      <ellipse cx="24" cy="18" rx="10" ry="11" fill="#fff" />
      <Face y={17} s={0.8} />
    </>
  ),
  mic: (
    <>
      <rect x="16" y="4" width="16" height="24" rx="8" fill={GOLD} stroke={INK} strokeWidth="2" />
      <path d="M10 22a14 14 0 0 0 28 0M24 36v7M17 43h14" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <Face y={15} s={0.7} />
    </>
  ),
  card: (
    <>
      <rect x="5" y="10" width="38" height="28" rx="6" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d="m6 13 18 14 18-14" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 38c-6-4-9-7-9-10a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 3-3 6-9 10Z" fill={GOLD} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ),
  coin: (
    <>
      <circle cx="24" cy="24" r="18" fill={GOLD} stroke={INK} strokeWidth="2" />
      <circle cx="24" cy="24" r="13" fill="none" stroke={INK} strokeWidth="1.2" strokeDasharray="2 3" />
      <Face y={23} />
    </>
  ),
  clipboard: (
    <>
      <rect x="9" y="8" width="30" height="35" rx="6" fill="#fff" stroke={INK} strokeWidth="2" />
      <rect x="17" y="4" width="14" height="8" rx="3" fill={GOLD} stroke={INK} strokeWidth="2" />
      <Face y={27} />
    </>
  ),
  envelope: (
    <>
      <rect x="5" y="11" width="38" height="27" rx="6" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d="m6 14 18 13 18-13" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="24" cy="31" r="5" fill={GOLD} stroke={INK} strokeWidth="1.6" />
    </>
  ),
  bubble: (
    <>
      <path d="M8 9h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22l-9 7v-7H8a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4Z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <Face y={22} />
    </>
  ),
  people: (
    <>
      <circle cx="24" cy="17" r="9" fill={CREAM} stroke={INK} strokeWidth="2" />
      <path d="M7 43c0-9 7-14 17-14s17 5 17 14Z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <Face y={17} s={0.85} />
    </>
  ),
  frame: (
    <>
      <rect x="6" y="8" width="36" height="32" rx="6" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d="m8 34 10-9 8 7 6-5 10 8" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="17" cy="18" r="3.2" fill={GOLD} stroke={INK} strokeWidth="1.6" />
    </>
  ),
  shop: (
    <>
      <path d="M6 18 10 8h28l4 10v3a6 6 0 0 1-12 0 6 6 0 0 1-12 0 6 6 0 0 1-12 0v-3Z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="9" y="26" width="30" height="15" rx="3" fill="#fff" stroke={INK} strokeWidth="2" />
      <Face y={32} s={0.85} />
    </>
  ),
};

export function ClientArt({ kind, className = "h-full w-full" }: { kind: ArtKind; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      {ART[kind]}
    </svg>
  );
}
