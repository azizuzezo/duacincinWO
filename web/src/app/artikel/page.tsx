import type { Metadata } from "next";

import { PublicShell } from "@/components/landing/PublicShell";
import { PageHero } from "@/components/landing/PageHero";
import { FeaturedArticle } from "@/components/public/artikel/ArticleCard";
import { ArticleGrid } from "@/components/public/artikel/ArticleGrid";
import { JsonLd, ORGANIZATION_LD } from "@/components/seo/JsonLd";
import { allArticles } from "@/lib/articles";
import { OPEN_GRAPH_BASE, SITE_URL } from "@/lib/site";

const TITLE = "Artikel persiapan pernikahan";
const DESCRIPTION = "Panduan persiapan pernikahan dari DuaCincin: checklist, anggaran, memilih venue dan vendor, sampai ragam adat pernikahan di Indonesia.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/artikel" },
  openGraph: { ...OPEN_GRAPH_BASE, title: TITLE, description: DESCRIPTION, url: "/artikel", type: "website" },
};

// Static and admin-written articles; the admin ones show up within 2 minutes of publishing.
export const revalidate = 120;

export default async function ArtikelIndexPage() {
  const ARTICLES = await allArticles();
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

  const [lead, ...rest] = ARTICLES;

  return (
    <PublicShell>
      <JsonLd data={listLd} />
      <div className="wd">
        <PageHero image="/banner/foto-artikel.webp" focus="70% 50%" crumbs={[{ name: "Artikel" }]} title="Artikel persiapan pernikahan" sub="Checklist, anggaran, venue, vendor, sampai ragam adat." />
        {lead && (
          <section aria-label="Artikel terbaru" className="wd-container pt-10 sm:pt-12">
            <FeaturedArticle article={lead} />
          </section>
        )}
        <section aria-label="Daftar artikel" className="wd-container py-12 sm:py-16">
          <ArticleGrid articles={rest} />
        </section>
      </div>
    </PublicShell>
  );
}
