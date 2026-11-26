// Four things a vendor gets, each with a little face-icon that wiggles on
// hover (never under reduced motion). Every line maps to a real screen in the
// vendor dashboard: storefront editor, booking chat, Dana Aman, payouts.
import type { ReactNode } from "react";

const INK = "#231f1d";

const Eyes = ({ y = 24 }: { y?: number }) => (
  <>
    <circle cx="18" cy={y} r="1.7" fill={INK} />
    <circle cx="30" cy={y} r="1.7" fill={INK} />
  </>
);
const Smile = ({ y = 31 }: { y?: number }) => (
  <path d={`M18 ${y}c1.8 2.2 3.8 3 6 3s4.2-.8 6-3`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
);

const PERKS: { title: string; body: string; tone: string; icon: ReactNode }[] = [
  {
    title: "Etalase sendiri",
    body: "Profil, portofolio, dan paket harga tampil rapi di direktori dan halaman kategori.",
    tone: "bg-[#f5ecd9]",
    icon: (
      <>
        <path d="M6 18 10 8h28l4 10v3a6 6 0 0 1-12 0 6 6 0 0 1-12 0 6 6 0 0 1-12 0v-3Z" fill="#dcbd80" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <rect x="9" y="26" width="30" height="15" rx="3" fill="#fff" stroke={INK} strokeWidth="2" />
        <circle cx="19" cy="32" r="1.4" fill={INK} />
        <circle cx="29" cy="32" r="1.4" fill={INK} />
        <path d="M20 36c1 1.2 2.4 1.7 4 1.7s3-.5 4-1.7" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Booking lewat chat",
    body: "Calon pengantin bertanya dan memesan langsung. Semua percakapan tersimpan di satu tempat.",
    tone: "bg-[#efe3c7]",
    icon: (
      <>
        <path d="M8 10h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22l-9 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <Eyes y={22} />
        <Smile y={27} />
      </>
    ),
  },
  {
    title: "Dana ditahan aman",
    body: "DP dan pelunasan masuk ke akun penampung DuaCincin sebelum kamu mulai bekerja.",
    tone: "bg-[#f5ecd9]",
    icon: (
      <>
        <path d="M24 5 8 11v11c0 10 6.5 17.5 16 21 9.5-3.5 16-11 16-21V11L24 5Z" fill="#dcbd80" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <Eyes y={23} />
        <Smile y={29} />
      </>
    ),
  },
  {
    title: "Pencairan jelas",
    body: "Setelah client mengonfirmasi acara selesai, dana diteruskan. Riwayatnya bisa dilihat kapan saja.",
    tone: "bg-[#efe3c7]",
    icon: (
      <>
        <circle cx="24" cy="24" r="18" fill="#fff" stroke={INK} strokeWidth="2" />
        <circle cx="24" cy="24" r="12" fill="#dcbd80" stroke={INK} strokeWidth="1.6" />
        <Eyes y={21} />
        <Smile y={27} />
      </>
    ),
  },
];

export function VendorPerks() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {PERKS.map((p) => (
        <li
          key={p.title}
          className={`group rounded-[24px] ${p.tone} p-4 transition-transform sm:p-6 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:transform-none`}
        >
          <span className="block h-16 w-16 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
            <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
              {p.icon}
            </svg>
          </span>
          <h3 className="wd-title mt-5 text-[1.2rem] leading-snug">{p.title}</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-wd-text">{p.body}</p>
        </li>
      ))}
    </ul>
  );
}
