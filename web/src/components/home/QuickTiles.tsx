// Quick-access tiles under the banners (marketplace pattern, as on
// WeddingMarket): four doors to what DuaCincin really offers, each a soft
// gold-family tile with an icon that nudges on hover. Kirana's tile shows
// only when the assistant is configured; otherwise it points to escrow.
import Link from "next/link";
import type { ReactNode } from "react";

type Tile = { href: string; title: string; sub: string; icon: ReactNode; bg: string; external?: boolean };

const I = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </svg>
  ),
  budget: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v9l6.5 4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  invite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

export function QuickTiles({ kirana }: { kirana: boolean }) {
  const tiles: Tile[] = [
    { href: "/vendors", title: "Cari vendor", sub: "Saring kota dan budget", icon: I.search, bg: "bg-[linear-gradient(135deg,#f6ecd8,#ecd9b0)]" },
    { href: "#budget", title: "Hitung budget", sub: "Bagi anggaran per kategori", icon: I.budget, bg: "bg-[linear-gradient(135deg,#f3ede4,#e3d6c3)]" },
    { href: "https://invitation.duacincin.id", title: "Digital Invitation", sub: "Pilih tema, data terisi", icon: I.invite, bg: "bg-[linear-gradient(135deg,#efe6dc,#dccbb8)]", external: true },
    kirana
      ? { href: "/kirana", title: "Tanya Kirana", sub: "Asisten AI DuaCincin", icon: I.chat, bg: "bg-[linear-gradient(135deg,#f5efe3,#e6d5b4)]" }
      : { href: "/cara-kerja", title: "Bayar aman", sub: "Cara kerja escrow", icon: I.shield, bg: "bg-[linear-gradient(135deg,#f5efe3,#e6d5b4)]" },
  ];
  return (
    <nav aria-label="Pintasan" className="bg-white pt-6">
      <ul className="wd-container grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center sm:h-11 sm:w-11 justify-center rounded-full bg-white/80 text-wd-accent-ink shadow-wd-card transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none [&>svg]:h-5 [&>svg]:w-5">
                {t.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.98rem] font-semibold text-wd-ink">{t.title}</span>
                <span className="hidden truncate text-[0.82rem] text-wd-text sm:block">{t.sub}</span>
              </span>
            </>
          );
          const cls = `group flex min-h-[76px] flex-col items-start gap-2 rounded-[18px] px-4 py-3.5 sm:flex-row sm:items-center transition-[transform,box-shadow] duration-300 hover:shadow-wd-lift motion-safe:hover:-translate-y-0.5 sm:gap-4 sm:px-5 ${t.bg}`;
          return (
            <li key={t.title}>
              {t.external ? (
                <a href={t.href} className={cls}>
                  {body}
                </a>
              ) : (
                <Link href={t.href} className={cls}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
