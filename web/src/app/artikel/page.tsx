import type { Metadata } from "next";

import { PublicShell } from "@/components/landing/PublicShell";
import { ArticleCard } from "@/components/public/artikel/ArticleCard";
import { JsonLd, ORGANIZATION_LD } from "@/components/seo/JsonLd";
import { ARTICLES } from "@/content/artikel/registry";
import { OPEN_GRAPH_BASE, SITE_URL } from "@/lib/site";

const TITLE = "Artikel persiapan pernikahan";
const DESCRIPTION = "Panduan persiapan pernikahan dari DuaCincin: checklist, anggaran, memilih venue dan vendor, sampai ragam adat pernikahan di Indonesia.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/artikel" },
  openGraph: { ...OPEN_GRAPH_BASE, title: TITLE, description: DESCRIPTION, url: "/artikel", type: "website" },
};

export default function ArtikelIndexPage() {
  const listLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${TITLE} | DuaCincin`,
    description: DESCRIPTION,
    url: `${SITE_URL}/artikel`,
    publisher: ORGANIZATION_LD,
    blogPost: ARTICLES.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: `${SITE_URL}/artikel/${a.slug}`,
      datePublished: a.published,
      dateModified: a.updated ?? a.published,
    })),
  };

  return (
    <PublicShell overlay={false}>
      <JsonLd data={listLd} />
      <header className="dc-grain border-b border-dc-line bg-dc-cream">
        <div className="dc-container py-12 sm:py-16">
          <p className="dc-eyebrow">Artikel</p>
          <h1 className="mt-4 max-w-3xl font-heading text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-dc-ink">
            Panduan menyiapkan <span className="dc-em">pernikahan</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dc-text-2">
            Checklist, anggaran, memilih venue dan vendor, sampai rangkaian adat. Ditulis dari pertanyaan yang paling sering diajukan calon pengantin.
          </p>
        </div>
      </header>
      <section aria-label="Daftar artikel" className="dc-container py-12 sm:py-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((a, i) => (
            <li key={a.slug}>
              <ArticleCard article={a} priority={i < 3} />
            </li>
          ))}
        </ul>
      </section>
    </PublicShell>
  );
}
