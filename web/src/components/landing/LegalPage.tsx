import Link from "next/link";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { LegalToc } from "@/components/public/legal/LegalToc";
import { CopyButton } from "@/components/public/shared/CopyButton";
import { ReadingProgress } from "@/components/public/shared/ReadingProgress";
import { COMPANY, COMPANY_PAGE } from "@/lib/company";
import { LEGAL_EFFECTIVE, LEGAL_VERSION } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

const DOCS = [
  { href: "/legal/client-tos", label: "Ketentuan Layanan Client", for: "Untuk calon pengantin" },
  { href: "/legal/vendor-agreement", label: "Perjanjian Kemitraan Vendor", for: "Untuk mitra vendor" },
];

/** Long-form legal layout ("Putih"): compact header, then a calm page with a numbered table of
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
    <PublicShell>
      <ReadingProgress targetId="isi-dokumen" />
      <div className="wd">
        <PageHero image="/banner/legal.webp" focus="70% 50%" crumbs={[{ name: "Legal" }, { name: title }]} title={title} sub={intro}>
          <dl className="mt-5 flex max-w-2xl flex-wrap gap-x-6 gap-y-2 text-sm text-wd-muted">
            <div className="flex gap-1.5">
              <dt>Versi</dt>
              <dd className="font-semibold text-wd-ink">{LEGAL_VERSION}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Berlaku sejak</dt>
              <dd className="font-semibold text-wd-ink">{LEGAL_EFFECTIVE}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Penyelenggara</dt>
              <dd className="font-semibold text-wd-ink">
                <Link href={COMPANY_PAGE} className="underline decoration-wd-accent-line underline-offset-4 hover:text-wd-accent-ink">
                  {COMPANY.name}
                </Link>
              </dd>
            </div>
          </dl>
        </PageHero>

        <div className="wd-container grid gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:col-span-4 xl:col-span-3">
            <details className="group rounded-[14px] border border-wd-line bg-white lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-wd-ink [&::-webkit-details-marker]:hidden">
                Daftar isi ({sections.length} bagian)
                <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" className="transition-transform group-open:rotate-180 motion-reduce:transition-none">
                  <path d="M2 5l5 5 5-5" />
                </svg>
              </summary>
              <div className="px-3 pb-3">
                <LegalToc items={toc} />
              </div>
            </details>
            <nav aria-label="Daftar isi" className="sticky top-36 hidden lg:block">
              <LegalToc items={toc} withHeader />
            </nav>
          </aside>

          <article id="isi-dokumen" className="min-w-0 lg:col-span-8 xl:col-span-7">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-judul`} className="scroll-mt-40 border-t border-wd-line py-8 first:border-t-0 first:pt-0">
                {/* Copy link: a clause is often quoted to the other party or to support. */}
                <div className="group/h flex items-start justify-between gap-3">
                  <h2 id={`${s.id}-judul`} className="wd-title flex items-baseline gap-3 text-[1.35rem] leading-snug">
                    <span className="text-wd-accent-ink tabular-nums">{i + 1}.</span>
                    {s.title}
                  </h2>
                  <span className="-mt-1.5 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/h:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
                    <CopyButton hash={s.id} label={`Salin tautan ke bagian ${i + 1}, ${s.title}`} />
                  </span>
                </div>
                <div className="mt-3 max-w-[68ch] text-[1.0625rem] leading-[1.8] text-wd-text [&_a]:font-semibold [&_a]:text-wd-accent-ink [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-semibold [&_strong]:text-wd-ink">{s.body}</div>
              </section>
            ))}

            <nav aria-label="Dokumen lain" className="mt-8 grid gap-3 border-t border-wd-line-2 pt-8 sm:grid-cols-2">
              {DOCS.map((d) => {
                const on = d.href === current;
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-16 flex-col justify-center rounded-[14px] border px-5 py-3 transition-colors ${on ? "border-wd-accent-line bg-wd-accent-wash" : "border-wd-line bg-white hover:border-wd-ink"}`}
                  >
                    <span className="text-xs text-wd-muted">{on ? "Sedang kamu baca" : d.for}</span>
                    <span className="font-semibold text-wd-ink">{d.label}</span>
                  </Link>
                );
              })}
            </nav>
            <p className="mt-6 text-sm text-wd-text">
              Ada pertanyaan soal dokumen ini?{" "}
              <Link href="/bantuan" className="font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
                Buka pusat bantuan
              </Link>
              .
            </p>
          </article>
        </div>
      </div>
    </PublicShell>
  );
}
