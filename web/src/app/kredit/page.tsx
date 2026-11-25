import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CREDIT_GROUPS, type PhotoCredit } from "@/components/kredit/credits";
import { PublicShell } from "@/components/landing/PublicShell";
import { PageHero } from "@/components/landing/PageHero";
import { Reveal } from "@/components/landing/Reveal";
import { ThumbViewer } from "@/components/public/kredit/ThumbViewer";
import { SectionNav } from "@/components/public/shared/SectionNav";
import { LIFT, ZOOM } from "@/components/public/shared/styles";

export const metadata: Metadata = {
  title: "Kredit foto",
  description: "Sumber, fotografer, dan lisensi setiap foto dan lukisan yang dipakai di DuaCincin.",
  alternates: { canonical: "/kredit" },
};

// Credits page: one row per picture, photo first, so a reader sees which
// picture each credit belongs to. Group tiles up top, a sticky section
// nav, and each thumbnail opens the picture larger.

// Soft tints of the Putih palette for the group tiles (text stays ink).
const TILE = ["bg-wd-accent-wash ring-wd-accent-soft", "bg-[#f3f0ea] ring-wd-line", "bg-[#f1f3ee] ring-[#e3e8dc]", "bg-[#f6efec] ring-[#ecdfd9]", "bg-wd-paper ring-wd-line"];

// Short labels for the sticky section nav (the full titles are long).
const SHORT: Record<string, string> = { beranda: "Beranda dan masuk", pinterest: "Board Pinterest", halaman: "Halaman lain", "banner-ai": "Banner AI", "digital-invitation": "Digital Invitation" };

const LINK = "rounded-sm font-semibold text-wd-ink underline decoration-wd-accent-line underline-offset-2 transition-colors hover:text-wd-accent-ink";

function Row({ c }: { c: PhotoCredit }) {
  return (
    <li className="-mx-3 flex gap-4 rounded-[16px] border-t border-wd-line px-3 py-5 transition-colors duration-300 first:border-t-0 hover:bg-wd-paper sm:gap-5">
      <ThumbViewer src={c.thumb} caption={c.what} title={`${c.title} oleh ${c.author}`} />
      <div className="min-w-0 text-[0.95rem] leading-relaxed text-wd-text">
        <p className="font-semibold text-wd-ink">{c.what}</p>
        <p className="mt-1 break-words">
          {c.source ? (
            <a href={c.source} target="_blank" rel="noopener noreferrer" className={LINK}>
              {c.title}
            </a>
          ) : (
            <span className="text-wd-ink">{c.title}</span>
          )}{" "}
          oleh {c.author}
        </p>
        <p className="mt-1">
          Lisensi:{" "}
          {c.licenseUrl ? (
            <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              {c.license}
            </a>
          ) : (
            c.license
          )}
        </p>
        <p className="mt-1.5 text-sm text-wd-muted">{c.change}</p>
      </div>
    </li>
  );
}

export default function KreditPage() {
  const total = CREDIT_GROUPS.reduce((n, g) => n + g.items.length, 0);
  return (
    <PublicShell>
      <div className="wd">
        <PageHero image="/banner/foto-kredit.webp" focus="70% 50%" crumbs={[{ name: "Kredit foto" }]} title="Kredit foto" sub={`Sumber, pembuat, dan lisensi ${total} gambar di DuaCincin. Klik judulnya untuk membuka sumber aslinya.`}>
          {/* One tile per group with three of its pictures, so the reader
              jumps straight to the picture they came looking for. */}
          <ul aria-label="Bagian" className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {CREDIT_GROUPS.map((g, i) => (
              <li key={g.id}>
                <a href={`#${g.id}`} className={`group flex h-full flex-col overflow-hidden rounded-[18px] ring-1 ring-inset ${TILE[i % TILE.length]} ${LIFT}`}>
                  <span aria-hidden className="grid h-20 grid-cols-3 gap-0.5 overflow-hidden">
                    {g.items.slice(0, 3).map((c) => (
                      <span key={c.thumb} className="relative overflow-hidden bg-wd-blush">
                        <Image src={c.thumb} alt="" fill sizes="80px" className={ZOOM} />
                      </span>
                    ))}
                  </span>
                  <span className="flex flex-1 flex-col justify-between gap-2 p-3.5">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-wd-ink">{g.title}</span>
                    <span className="text-xs text-wd-text">{g.items.length} gambar</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </PageHero>
        <SectionNav label="Bagian kredit" items={CREDIT_GROUPS.map((g) => ({ id: g.id, label: SHORT[g.id] ?? g.title, count: g.items.length }))} />

        <div className="wd-container py-10 sm:py-14">
          {CREDIT_GROUPS.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-judul`} className="scroll-mt-48 border-t border-wd-line py-10 first:border-t-0 first:pt-0 lg:grid lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-[190px]">
                <h2 id={`${g.id}-judul`} className="wd-title text-[1.35rem] leading-snug">
                  {g.title}
                </h2>
                <p className="mt-2 max-w-sm text-[0.95rem] leading-relaxed text-wd-text">{g.note}</p>
                </div>
              </div>
              <Reveal className="mt-6 lg:col-span-8 lg:mt-0">
                <ul className="dc-stagger grid gap-x-10 md:grid-cols-2 md:[&>li:nth-child(2)]:border-t-0">
                  {g.items.map((c) => (
                    <Row key={`${g.id}-${c.thumb}`} c={c} />
                  ))}
                </ul>
              </Reveal>
            </section>
          ))}

          <p className="mt-4 max-w-2xl border-t border-wd-line pt-8 text-sm leading-relaxed text-wd-muted">
            Logo DuaCincin dan tangkapan layar aplikasi adalah milik DuaCincin. Foto di profil vendor diunggah oleh vendor masing-masing. Ada
            foto yang belum tercantum di sini?{" "}
            <Link href="/bantuan" className={LINK}>
              Hubungi kami lewat pusat bantuan
            </Link>
            .
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
