import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SectionHead, Shield, wdButton } from "@/components/home/ui";
import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { Reveal } from "@/components/landing/Reveal";
import { CopyButton } from "@/components/public/shared/CopyButton";
import { SectionNav } from "@/components/public/shared/SectionNav";
import { LIFT, ZOOM } from "@/components/public/shared/styles";
import { Principles, type Principle } from "@/components/public/tentang-kami/Principles";
import { JsonLd, ORGANIZATION_REF, personLd, webPageLd } from "@/components/seo/JsonLd";
import { PhoneFrame } from "@/components/ui/DeviceFrame";
import { COMPANY } from "@/lib/company";
import { FOUNDERS } from "@/lib/team";

export const metadata: Metadata = {
  title: "Tentang kami",
  description: `Visi DuaCincin, pendirinya, dan ${COMPANY.name}, perusahaan yang mengelola DuaCincin.`,
  alternates: { canonical: "/tentang-kami" },
};

// Legal data from lib/company.ts (the old /perusahaan page now redirects here).
const LEGAL = [
  { label: "Nomor sertifikat pendirian", value: COMPANY.deedNumber },
  { label: "Nomor Induk Berusaha (NIB)", value: COMPANY.nib },
  { label: "NPWP perusahaan", value: COMPANY.npwp },
  { label: "Tanda daftar PSE lingkup privat", value: COMPANY.pseNumber },
];

const SHOT = "/showcase/pages";

// The vision in three pillars, each shown on the real screen where it
// happens (worded as on /cara-kerja, /untuk-vendor and /bantuan).
const PRINCIPLES: Principle[] = [
  {
    id: "aman",
    title: "Aman, tanpa takut vendor nakal",
    body: "Vendor ditinjau Admin sebelum tampil, dan DP serta pelunasan ditahan DuaCincin. Dana baru diteruskan setelah kamu mengonfirmasi acara selesai.",
    link: { href: "/cara-kerja", label: "Lihat cara kerja Dana Aman" },
    screen: { src: `${SHOT}/k4-dp.webp`, alt: "Detail booking berstatus DP dibayar, dana ditahan DuaCincin" },
  },
  {
    id: "vendor",
    title: "Wadah vendor mendapatkan client",
    body: "Vendor terverifikasi tampil di direktori, dihubungi calon pengantin lewat chat, dan menerima booking di satu tempat.",
    link: { href: "/untuk-vendor", label: "Untuk vendor" },
    screen: { src: `${SHOT}/k1-direktori.webp`, alt: "Direktori vendor DuaCincin dengan kartu vendor, harga mulai dari, dan rating" },
  },
  {
    id: "budget",
    title: "Kami bantu sesuaikan dengan budget",
    body: "Budget planner membagi anggaranmu per kategori, dan wedding consultant kami merekomendasikan vendor yang pas dengan budget itu.",
    link: { href: "/#budget", label: "Coba hitung budget" },
    screen: { src: `${SHOT}/k5-konsultan.webp`, alt: "Chat dengan wedding consultant DuaCincin yang merekomendasikan vendor" },
  },
];

const INVITATION_THEMES = [
  { src: "/invitation/java.webp", name: "Jawa" },
  { src: "/invitation/luminousgate.webp", name: "Luminous Gate" },
  { src: "/invitation/gardenparty.webp", name: "Garden Party" },
];

const NAV = [
  { id: "visi", label: "Visi" },
  { id: "pendiri", label: "Pendiri" },
  { id: "produk", label: "Produk" },
  { id: "perusahaan", label: "Perusahaan" },
];

function ArrowOut() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function TentangKamiPage() {
    return (
    <PublicShell>
      <JsonLd
        data={{
          ...webPageLd("AboutPage", "/tentang-kami", "Tentang DuaCincin", "Visi DuaCincin, pendirinya, dan PT Karsa Loka Semesta, perusahaan yang mengelola DuaCincin."),
          about: ORGANIZATION_REF,
          mentions: FOUNDERS.map((f) => personLd(f)),
        }}
      />
      <div className="wd">
        <PageHero
          image="/banner/foto-tentang.webp"
          focus="65% 50%"
          crumbs={[{ name: "Tentang kami" }]}
          title={
            <>
              Tentang <span className="font-wd-display font-normal italic text-wd-accent-ink">DuaCincin</span>
            </>
          }
          sub="Dibangun oleh dua orang dari dunia layanan pelanggan, supaya calon pengantin bisa memilih vendor dan membayar dengan tenang."
          actions={
            <>
              <Link href="#visi" className={wdButton()}>
                Baca visi kami
              </Link>
              <Link href="#pendiri" className={wdButton({ variant: "outline" })}>
                Kenalan dengan pendiri
              </Link>
            </>
          }
        />

        <SectionNav items={NAV} label="Bagian halaman" />

        {/* Vision */}
        <section id="visi" aria-labelledby="visi-judul" className="scroll-mt-48 bg-white py-14 sm:py-20">
          <div className="wd-container">
            <Reveal>
              {/* Vision card: a real wedding photo beside the statement, then the
                  statement broken into its three promises. */}
              <div className="grid overflow-hidden rounded-[32px] border border-wd-accent-line bg-[linear-gradient(120deg,#fffdf9_0%,#fbf7ef_45%,#f3e7cf_100%)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="relative min-h-[240px] overflow-hidden sm:min-h-[320px]">
                  <Image src="/photos/pinterest/pelaminan-kristal.webp" alt="Pelaminan putih dengan lampu kristal dan bunga gantung" fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
                  <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-wd-ink shadow-wd-card">
                    <svg aria-hidden width="20" height="13" viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="4" className="text-wd-accent-ink">
                      <circle cx="24" cy="20" r="14" />
                      <circle cx="40" cy="20" r="14" />
                    </svg>
                    Visi DuaCincin
                  </span>
                </div>
                <div className="relative p-7 sm:p-10 lg:p-14">
                  <span aria-hidden className="pointer-events-none absolute right-6 top-2 font-wd-display text-[9rem] leading-none text-wd-accent/40 select-none">&rdquo;</span>
                  <h2 id="visi-judul" className="wd-kicker relative">
                    Visi perusahaan
                  </h2>
                  <p className="wd-display relative mt-3 text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.28]">
                    Menciptakan wadah yang aman bagi masyarakat Indonesia untuk menggelar pernikahan <em>tanpa takut vendor nakal</em>, sekaligus wadah bagi vendor untuk mendapatkan client, dengan pilihan yang sesuai budget setiap pasangan.
                  </p>
                  <span aria-hidden className="relative mt-7 block h-px w-16 bg-wd-accent" />
                  <ul className="relative mt-7 grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        t: "Aman dari vendor nakal",
                        d: "Vendor ditinjau, dana ditahan DuaCincin",
                        icon: <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4" />,
                      },
                      {
                        t: "Client untuk vendor",
                        d: "Tampil di direktori, terima booking",
                        icon: <path d="M4 10h16l-1-5H5l-1 5Zm1 0v9h14v-9M9 19v-5h6v5" />,
                      },
                      {
                        t: "Sesuai budget",
                        d: "Planner dan konsultan membantu",
                        icon: <path d="M12 3v9l6 3.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
                      },
                    ].map((v) => (
                      <li key={v.t} className="rounded-[18px] bg-white/80 p-4 ring-1 ring-wd-line transition-[transform,box-shadow] duration-300 hover:shadow-wd-lift motion-safe:hover:-translate-y-0.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wd-accent-soft text-wd-accent-ink">
                          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            {v.icon}
                          </svg>
                        </span>
                        <p className="mt-3 text-[0.95rem] font-semibold text-wd-ink">{v.t}</p>
                        <p className="mt-0.5 text-[0.85rem] leading-snug text-wd-text">{v.d}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
            <div className="mt-14">
              <SectionHead id="wujud-judul" title="Tiga hal yang kami pegang" sub="Pilih satu untuk melihat layarnya di DuaCincin." />
              <Reveal className="mt-8">
                <Principles items={PRINCIPLES} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Founders: one joined panel, a row per founder, a large square photo
            (shown whole) beside the text, zigzagging: photo left, then right. */}
        <section id="pendiri" aria-labelledby="pendiri-judul" className="scroll-mt-48 bg-wd-paper py-14 sm:py-20">
          <div className="wd-container">
            <SectionHead id="pendiri-judul" title="Pendiri" sub="Dua orang yang membangun dan menjalankan DuaCincin." />
            <Reveal>
              <div className="mt-8 overflow-hidden rounded-[28px] border border-wd-line bg-white">
                {FOUNDERS.map((f, i) => {
                  const flip = i % 2 === 1;
                  return (
                    <article key={f.name} id={`pendiri-${i + 1}`} className={`group grid scroll-mt-48 ${flip ? "lg:grid-cols-[minmax(0,1fr)_400px]" : "lg:grid-cols-[400px_minmax(0,1fr)]"} ${i > 0 ? "border-t border-wd-line" : ""}`}>
                      <div className={`relative mx-auto aspect-square w-full max-w-[400px] overflow-hidden bg-wd-blush lg:max-w-none ${flip ? "lg:order-2" : ""}`}>
                        <Image src={f.photo} alt={`Foto ${f.name}`} fill sizes="400px" quality={95} className={`${ZOOM} object-top`} />
                      </div>
                      <div className={`flex flex-col justify-center p-7 sm:p-12 lg:p-16 ${flip ? "lg:order-1" : ""}`}>
                        <p className="text-sm font-semibold text-wd-accent-ink">{f.role}</p>
                        <h3 className="wd-display mt-3 text-[clamp(2.2rem,3.6vw,3.2rem)] leading-[1.04]">{f.name}</h3>
                        {f.altName && (
                          <p lang={f.altName.lang} className="mt-2 text-xl tracking-[0.08em] text-wd-muted">
                            {f.altName.text}
                          </p>
                        )}
                        <p className="mt-5 max-w-[46ch] text-[1.05rem] leading-relaxed text-wd-text">{f.bio}</p>
                        {f.links && (
                          <p className="mt-7 flex flex-wrap gap-2">
                            {f.links.map((l) => (
                              <a
                                key={l.href}
                                href={l.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-wd-line-2 px-4 text-sm font-semibold text-wd-ink transition-colors hover:border-wd-ink hover:bg-wd-blush"
                              >
                                {l.label}
                                <ArrowOut />
                                <span className="sr-only"> {f.name} (tab baru)</span>
                              </a>
                            ))}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Products: full phones that run off the bottom edge of the card, never a cropped stub. */}
        <section id="produk" aria-labelledby="produk-judul" className="scroll-mt-48 bg-white py-14 sm:py-20">
          <div className="wd-container">
            <SectionHead id="produk-judul" title="Yang kami bangun" sub="Dari mencari vendor sampai undangan untuk tamu." />
            <Reveal>
              <ul className="dc-stagger mt-8 grid gap-6 lg:grid-cols-2">
                <li>
                  <Link href="/vendors" className={`group relative grid h-full min-h-[340px] overflow-hidden rounded-[24px] border border-wd-line bg-white sm:grid-cols-[1fr_210px] ${LIFT}`}>
                    <span className="flex flex-col p-7">
                      <span className="inline-flex w-fit rounded-full bg-wd-accent-soft px-3 py-1 text-xs font-semibold text-wd-accent-ink">duacincin.id</span>
                      <span className="wd-title mt-3 block text-[1.4rem] leading-snug">Marketplace vendor dan wedding planner</span>
                      <span className="mt-2 block leading-relaxed text-wd-text">Cari vendor, chat, booking dengan Dana Aman, lalu atur anggaran, tamu, dan rundown di akun yang sama.</span>
                      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[0.95rem] font-semibold text-wd-ink">
                        Cari vendor
                        <ArrowRight />
                      </span>
                    </span>
                    <span aria-hidden className="relative hidden sm:block">
                      <span className="absolute left-2 top-8 w-[180px] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-3 motion-reduce:transition-none">
                        <PhoneFrame src="/showcase/planner-phone.webp" alt="" sizes="180px" />
                      </span>
                    </span>
                  </Link>
                </li>
                <li>
                  <a
                    href="https://invitation.duacincin.id"
                    className={`group relative grid h-full min-h-[340px] overflow-hidden rounded-[24px] bg-[radial-gradient(ellipse_at_80%_40%,#4a3a2c_0%,#2b231d_60%,#1f1915_100%)] text-white sm:grid-cols-[1fr_240px] ${LIFT}`}
                  >
                    <span className="flex flex-col p-7">
                      <span className="inline-flex w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#e3c78c]">invitation.duacincin.id</span>
                      <span className="mt-3 block text-[1.4rem] font-[650] leading-snug tracking-[-0.015em]">DuaCincin Digital Invitation</span>
                      <span className="mt-2 block leading-relaxed text-white/85">Pilih tema; nama, tanggal, tempat, dan daftar tamu diambil dari rencanamu.</span>
                      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[0.95rem] font-semibold text-[#e3c78c]">
                        Lihat semua tema
                        <ArrowRight />
                      </span>
                    </span>
                    {/* Three real themes as whole phones; they fan out on hover. */}
                    <span role="img" aria-label={`Contoh tema: ${INVITATION_THEMES.map((t) => t.name).join(", ")}`} className="relative mx-auto mb-6 flex h-[250px] w-[240px] items-center justify-center sm:my-auto">
                      {INVITATION_THEMES.map((t, i) => (
                        <span
                          key={t.src}
                          className={`absolute w-[100px] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                            i === 0
                              ? "-translate-x-[62px] -rotate-6 scale-90 group-hover:-translate-x-[78px] group-hover:-rotate-[10deg]"
                              : i === 2
                                ? "translate-x-[62px] rotate-6 scale-90 group-hover:translate-x-[78px] group-hover:rotate-[10deg]"
                                : "z-10 group-hover:-translate-y-2"
                          }`}
                        >
                          <PhoneFrame src={t.src} alt="" sizes="100px" immersive screen="dark" surface="dark" />
                        </span>
                      ))}
                    </span>
                  </a>
                </li>
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Company */}
        <section id="perusahaan" aria-labelledby="perusahaan-judul" className="scroll-mt-48 bg-wd-paper py-14 sm:py-20">
          <div className="wd-container grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <SectionHead id="perusahaan-judul" title="Perusahaan" sub={`DuaCincin dikelola ${COMPANY.name}, perusahaan terdaftar di Indonesia.`} />
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-wd-accent-wash px-4 py-2 text-sm font-semibold text-wd-ok ring-1 ring-wd-line">
                <Shield size={18} />
                Sistem {COMPANY.pseSystem} terdaftar PSE lingkup privat
              </p>
            </div>
            <Reveal>
              <dl className="dc-stagger grid gap-px overflow-hidden rounded-[20px] border border-wd-line bg-wd-line sm:grid-cols-2">
                <div className="bg-white p-6 sm:col-span-2">
                  <dt className="text-sm text-wd-muted">Nama perusahaan</dt>
                  <dd className="mt-1.5 font-semibold text-wd-ink">{COMPANY.name}</dd>
                </div>
                {LEGAL.map((r) => (
                  <div key={r.label} className="bg-white py-4 pl-6 pr-3 transition-colors hover:bg-wd-accent-wash">
                    <dt className="text-sm text-wd-muted">{r.label}</dt>
                    <dd className="mt-0.5 flex items-center justify-between gap-3">
                      <span className="min-w-0 break-words font-semibold text-wd-ink tabular-nums">{r.value}</span>
                      <CopyButton value={r.value} label={`Salin ${r.label}`} showText />
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* Close */}
        <section aria-labelledby="ajak-judul" className="bg-wd-paper pb-16 sm:pb-20">
          <div className="wd-container">
            <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-wd-ink px-7 py-10 text-white sm:flex-row sm:items-center sm:px-12">
              <div>
                <h2 id="ajak-judul" className="text-[1.6rem] font-semibold leading-snug">
                  Siap mulai merencanakan?
                </h2>
                <p className="mt-1.5 text-white/80">Akun calon pengantin gratis. Vendor bisa daftar dan diverifikasi tim kami.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/register?role=client" className={wdButton()}>
                  Buat akun gratis
                </Link>
                <Link href="/register?role=vendor" className={wdButton({ variant: "ink", className: "border border-white/30 hover:border-white" })}>
                  Daftar sebagai vendor
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
