import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CREDIT_GROUPS, type PhotoCredit } from "@/components/kredit/credits";
import { PublicShell } from "@/components/landing/PublicShell";
import { Reveal } from "@/components/landing/Reveal";

export const metadata: Metadata = {
  title: "Kredit foto",
  description: "Sumber, fotografer, dan lisensi setiap foto dan lukisan yang dipakai di DuaCincin.",
};

// Credits page: one row per picture, photo first, so a reader sees which
// picture each credit belongs to. Paper layout like the legal pages (ENERGY 1,
// MOTION 1: rows reveal once on scroll, nothing else moves).

const LINK =
  "rounded-sm font-semibold text-dc-ink underline decoration-dc-gold/60 underline-offset-2 transition-colors hover:decoration-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

function Row({ c }: { c: PhotoCredit }) {
  return (
    <li className="flex gap-4 border-t border-dc-line py-5 first:border-t-0 sm:gap-5">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-dc-paper-3 sm:h-24 sm:w-24">
        <Image src={c.thumb} alt="" fill sizes="96px" className="object-cover object-[50%_25%]" />
      </div>
      <div className="min-w-0 text-[0.95rem] leading-relaxed text-dc-text-2">
        <p className="font-semibold text-dc-ink">{c.what}</p>
        <p className="mt-1 break-words">
          <a href={c.source} target="_blank" rel="noopener noreferrer" className={LINK}>
            {c.title}
          </a>{" "}
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
        <p className="mt-1.5 text-sm text-dc-text-2">{c.change}</p>
      </div>
    </li>
  );
}

export default function KreditPage() {
  const total = CREDIT_GROUPS.reduce((n, g) => n + g.items.length, 0);
  return (
    <PublicShell overlay={false}>
      <header className="dc-grain border-b border-dc-line bg-dc-cream">
        <div className="dc-container py-12 sm:py-16">
          <p className="dc-eyebrow">Kredit foto</p>
          <h1 className="mt-4 max-w-3xl font-heading text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-dc-ink">
            Foto pernikahan asli, dengan nama <span className="dc-em">pemotretnya</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dc-text-2">
            Semua {total} gambar di bawah berasal dari Wikimedia Commons dengan lisensi terbuka atau domain publik. Klik judulnya
            untuk membuka halaman sumber. Foto yang kami potong atau ubah tetap memakai lisensi yang sama.
          </p>
          <nav aria-label="Bagian" className="mt-8 flex flex-wrap gap-2">
            {CREDIT_GROUPS.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-dc-line-strong bg-dc-white px-4 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
              >
                {g.title}
                <span className="ml-2 text-dc-text-3">{g.items.length}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="dc-container py-10 sm:py-14">
        {CREDIT_GROUPS.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-judul`} className="scroll-mt-28 border-t border-dc-line-strong py-10 first:border-t-0 first:pt-0 lg:grid lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <h2 id={`${g.id}-judul`} className="font-heading text-[2rem] leading-tight text-dc-ink">
                {g.title}
              </h2>
              <p className="mt-3 max-w-sm leading-relaxed text-dc-text-2">{g.note}</p>
            </div>
            <Reveal className="mt-6 lg:col-span-8 lg:mt-0">
              <ul className="grid gap-x-10 md:grid-cols-2 md:[&>li:nth-child(2)]:border-t-0">
                {g.items.map((c) => (
                  <Row key={`${g.id}-${c.thumb}`} c={c} />
                ))}
              </ul>
            </Reveal>
          </section>
        ))}

        <p className="mt-4 max-w-2xl border-t border-dc-line pt-8 text-sm leading-relaxed text-dc-text-3">
          Logo DuaCincin dan tangkapan layar aplikasi adalah milik DuaCincin. Foto di profil vendor diunggah oleh vendor masing-masing. Ada
          foto yang belum tercantum di sini?{" "}
          <Link href="/bantuan" className={LINK}>
            Hubungi kami lewat pusat bantuan
          </Link>
          .
        </p>
      </div>
    </PublicShell>
  );
}
