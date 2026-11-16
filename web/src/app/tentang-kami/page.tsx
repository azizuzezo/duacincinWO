import type { Metadata } from "next";

import { Founders } from "@/components/landing/Founders";
import { PublicShell } from "@/components/landing/PublicShell";
import { Reveal } from "@/components/landing/Reveal";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Tentang kami",
  description: `Kenalan dengan pendiri DuaCincin dan ${COMPANY.name}, perusahaan yang mengelola DuaCincin.`,
  alternates: { canonical: "/tentang-kami" },
};

// Legal data from lib/company.ts (the old /perusahaan page now redirects here).
const LEGAL = [
  { label: "Nomor sertifikat pendirian", value: COMPANY.deedNumber },
  { label: "Nomor Induk Berusaha (NIB)", value: COMPANY.nib },
  { label: "NPWP perusahaan", value: COMPANY.npwp },
  { label: "Tanda daftar PSE lingkup privat", value: COMPANY.pseNumber },
];

function Shield() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

// Paper layout: header, the founders (zigzag panel), then the company.
export default function TentangKamiPage() {
  return (
    <PublicShell overlay={false}>
      <header className="dc-grain border-b border-dc-line bg-dc-cream">
        <div className="dc-container py-12 sm:py-16">
          <p className="dc-eyebrow">Tentang kami</p>
          <h1 className="mt-4 max-w-3xl font-heading text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-dc-ink">
            Orang di balik <span className="dc-em">DuaCincin.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dc-text-2">
            Kami berdua datang dari dunia layanan pelanggan. Kami tahu rasanya jadi orang yang dititipi kepercayaan, dan itu yang kami
            bangun ke dalam DuaCincin.
          </p>
        </div>
      </header>

      <div className="dc-container py-10 sm:py-14">
        <Founders />
      </div>

      <section id="perusahaan" aria-labelledby="perusahaan-judul" className="dc-grain border-t border-dc-line bg-dc-cream">
        <div className="dc-container grid gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <Reveal>
            <p className="dc-eyebrow">Perusahaan</p>
            <h2 id="perusahaan-judul" className="mt-4 font-heading text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1.02] text-dc-ink [text-wrap:balance]">
              DuaCincin dikelola <span className="dc-em">{COMPANY.name}.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-dc-text-2">
              Perusahaan yang terdaftar di Indonesia, dan sistem {COMPANY.pseSystem} terdaftar sebagai penyelenggara sistem
              elektronik lingkup privat.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-dc-success-soft px-4 py-2 text-sm font-semibold text-dc-success">
              <Shield />
              Terdaftar sebagai PSE lingkup privat
            </p>
          </Reveal>

          <Reveal>
            <dl className="dc-stagger grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-dc-ink p-6 text-dc-on-dark sm:col-span-2 sm:p-8">
                <dt className="text-sm text-dc-on-dark/75">Nama perusahaan</dt>
                <dd className="mt-2 font-heading text-[clamp(1.8rem,3vw,2.4rem)] leading-tight text-dc-gold-antique">{COMPANY.name}</dd>
              </div>
              {LEGAL.map((r) => (
                <div key={r.label} className="rounded-xl border border-dc-line bg-dc-white p-6 shadow-soft">
                  <dt className="text-sm text-dc-text-3">{r.label}</dt>
                  <dd className="mt-2 break-words font-semibold text-dc-ink tabular-nums">{r.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>
    </PublicShell>
  );
}
