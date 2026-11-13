import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { LegalToc } from "@/components/public/legal/LegalToc";
import { COMPANY, COMPANY_PAGE } from "@/lib/company";
import { LEGAL_EFFECTIVE, LEGAL_VERSION } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

const DOCS = [
  { href: "/legal/client-tos", label: "Ketentuan Layanan Client", for: "Untuk calon pengantin" },
  { href: "/legal/vendor-agreement", label: "Perjanjian Kemitraan Vendor", for: "Untuk mitra vendor" },
];

/** Long-form legal layout: a calm paper page with a numbered table of
 * contents (sticky with scroll spy on desktop, foldable on phones), one
 * readable column (~68 characters), and links to the other documents.
 * ENERGY 1 / MOTION 1 on purpose: legal text should feel steady. */
export function LegalPage({
  title,
  current,
  intro,
  sections,
}: {
  title: string;
  /** href of this document, to mark it in the document switcher. */
  current: string;
  intro?: React.ReactNode;
  sections: LegalSection[];
}) {
  const toc = sections.map(({ id, title: t }) => ({ id, title: t }));
  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main id="konten" className="flex-1">
        <header className="dc-grain border-b border-dc-line bg-dc-cream">
          <div className="dc-container py-12 sm:py-16">
            <p className="dc-eyebrow">Dokumen legal</p>
            <h1 className="mt-4 max-w-3xl font-heading text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-dc-ink">{title}</h1>
            {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dc-text-2">{intro}</p>}
            <dl className="mt-6 flex max-w-2xl flex-wrap gap-x-6 gap-y-2 text-sm text-dc-text-2">
              <div className="flex gap-1.5">
                <dt>Versi</dt>
                <dd className="font-semibold text-dc-ink">{LEGAL_VERSION}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Berlaku sejak</dt>
                <dd className="font-semibold text-dc-ink">{LEGAL_EFFECTIVE}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Penyelenggara</dt>
                <dd className="font-semibold text-dc-ink">
                  <Link href={COMPANY_PAGE} className="underline decoration-dc-gold/50 underline-offset-4 hover:text-dc-clay">
                    {COMPANY.name}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="dc-container grid gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:col-span-4 xl:col-span-3">
            <details className="group rounded-xl border border-dc-line bg-dc-white lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-dc-ink [&::-webkit-details-marker]:hidden">
                Daftar isi ({sections.length} bagian)
                <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" className="transition-transform group-open:rotate-180 motion-reduce:transition-none">
                  <path d="M2 5l5 5 5-5" />
                </svg>
              </summary>
              <div className="px-3 pb-3">
                <LegalToc items={toc} />
              </div>
            </details>
            <nav aria-label="Daftar isi" className="sticky top-28 hidden lg:block">
              <p className="mb-3 text-sm font-semibold text-dc-text-3">Daftar isi</p>
              <LegalToc items={toc} />
            </nav>
          </aside>

          <article className="min-w-0 lg:col-span-8 xl:col-span-7">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-judul`} className="scroll-mt-28 border-t border-dc-line py-8 first:border-t-0 first:pt-0">
                <h2 id={`${s.id}-judul`} className="flex items-baseline gap-3 font-heading text-[1.85rem] leading-tight text-dc-ink">
                  <span className="text-xl text-dc-clay tabular-nums">{i + 1}.</span>
                  {s.title}
                </h2>
                <div className="mt-3 max-w-[68ch] text-[1.0625rem] leading-[1.8] text-dc-text-2 [&_strong]:font-semibold [&_strong]:text-dc-ink">{s.body}</div>
              </section>
            ))}

            <nav aria-label="Dokumen lain" className="mt-8 grid gap-3 border-t border-dc-line-strong pt-8 sm:grid-cols-2">
              {DOCS.map((d) => {
                const on = d.href === current;
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-16 flex-col justify-center rounded-xl border px-5 py-3 transition-colors ${on ? "border-dc-gold bg-dc-cream" : "border-dc-line bg-dc-white hover:border-dc-ink"}`}
                  >
                    <span className="text-xs text-dc-text-3">{on ? "Sedang kamu baca" : d.for}</span>
                    <span className="font-semibold text-dc-ink">{d.label}</span>
                  </Link>
                );
              })}
            </nav>
            <p className="mt-6 text-sm text-dc-text-2">
              Ada pertanyaan soal dokumen ini?{" "}
              <Link href="/bantuan" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
                Buka pusat bantuan
              </Link>
              .
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
