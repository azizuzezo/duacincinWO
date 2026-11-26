import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/landing/PublicShell";
import { ArticleCard } from "@/components/public/artikel/ArticleCard";
import { ArticleToc } from "@/components/public/artikel/ArticleToc";
import { ReadingProgress } from "@/components/public/shared/ReadingProgress";
import { ShareButton } from "@/components/public/shared/ShareButton";
import {
  breadcrumbLd,
  JsonLd,
  ORGANIZATION_LD,
  ORGANIZATION_REF,
} from "@/components/seo/JsonLd";
import { SectionHead, SeeAll, wdButton } from "@/components/home/ui";
import {
  ARTICLES,
  articleBySlug,
  formatArticleDate,
  type Article,
} from "@/content/artikel/registry";
import { RichBody } from "@/components/public/artikel/RichBody";
import { allArticles, fetchDbArticle, type DbArticle } from "@/lib/articles";
import { categoryLabel } from "@/lib/api";
import { OPEN_GRAPH_BASE, SITE_URL } from "@/lib/site";

// The static MDX articles (src/content/artikel/registry.ts) are built ahead of
// time. Articles written in the admin panel are fetched on first visit and
// cached for 2 minutes; a slug that is neither is a 404.
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}
export const dynamicParams = true;
export const revalidate = 120;

async function resolve(slug: string): Promise<{ a: Article; db: DbArticle | null } | null> {
  const fixed = articleBySlug(slug);
  if (fixed) return { a: fixed, db: null };
  const db = await fetchDbArticle(slug);
  return db ? { a: db, db } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/artikel/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) return {};
  const a = found.a;
  const url = `/artikel/${a.slug}`;
  return {
    title: a.metaTitle ?? a.title,
    description: a.description,
    alternates: { canonical: url },
    // The share image is ./opengraph-image.tsx (the article photo in the brand card).
    openGraph: {
      ...OPEN_GRAPH_BASE,
      type: "article",
      title: a.title,
      description: a.description,
      url,
      publishedTime: a.published,
      modifiedTime: a.updated ?? a.published,
      section: a.topic,
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.description,
    },
  };
}

export default async function ArtikelPage({
  params,
}: PageProps<"/artikel/[slug]">) {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) notFound();
  const { a, db } = found;
  const Body = db ? null : (await import(`@/content/artikel/${a.slug}.mdx`)).default;
  const url = `${SITE_URL}/artikel/${a.slug}`;
  const others = (await allArticles()).filter((o) => o.slug !== a.slug).slice(0, 3);
  const crumbs = [
    { name: "Artikel", path: "/artikel" },
    { name: a.title, path: `/artikel/${a.slug}` },
  ];
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    description: a.description,
    image: [a.image.startsWith("http") ? a.image : `${SITE_URL}${a.image}`],
    // Dates in the registry are days; publish time is 08:00 WIB.
    datePublished: `${a.published}T08:00:00+07:00`,
    dateModified: `${a.updated ?? a.published}T08:00:00+07:00`,
    inLanguage: "id-ID",
    articleSection: a.topic,
    author: ORGANIZATION_LD,
    publisher: ORGANIZATION_REF,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <PublicShell>
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <ReadingProgress targetId="isi-artikel" />
      <div className="wd">
        <article>
          <header className="wd-container max-w-[800px] pt-5 text-center sm:pt-6">
            <nav aria-label="Jalur halaman">
              <ol className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-wd-muted">
                <li>
                  <Link
                    href="/"
                    className="inline-flex min-h-11 items-center hover:text-wd-ink"
                  >
                    Beranda
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href="/artikel"
                    className="inline-flex min-h-11 items-center hover:text-wd-ink"
                  >
                    Artikel
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li
                  aria-current="page"
                  className="font-medium text-wd-accent-ink"
                >
                  {a.topic}
                </li>
              </ol>
            </nav>
            <h1 className="wd-title mx-auto mt-3 text-[clamp(1.9rem,4vw,2.9rem)] leading-[1.12]">
              {a.title}
            </h1>
            <p className="mx-auto mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed text-wd-text">
              {a.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <p className="text-sm text-wd-muted">
                {db?.author ?? "Tim DuaCincin"} · {a.updated ? "Diperbarui " : ""}
                <time dateTime={a.updated ?? a.published}>
                  {formatArticleDate(a.updated ?? a.published)}
                </time>{" "}
                · {a.readMinutes} menit baca
              </p>
              <ShareButton
                path={`/artikel/${a.slug}`}
                title={a.title}
                variant="pill"
              />
            </div>
          </header>

          <div className="wd-container mt-8 max-w-[1040px]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[24px] bg-wd-blush">
              <Image
                src={a.image}
                alt={a.imageAlt}
                fill
                priority
                unoptimized={a.image.startsWith("http")}
                sizes="(min-width: 1040px) 980px, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Reading column with the table of contents beside it on wide
              screens (above it on phones). MDX typography comes from
              mdx-components.tsx; the headings are switched to the Putih sans here. */}
          <div className="wd-container max-w-[1180px] py-10 sm:py-14 xl:grid xl:grid-cols-[230px_minmax(0,720px)] xl:justify-center xl:gap-16">
            <div className="mx-auto max-w-[720px] xl:mx-0 xl:max-w-none">
              <ArticleToc containerId="isi-artikel" />
            </div>
            <div
              id="isi-artikel"
              className="mx-auto max-w-[720px] xl:mx-0 xl:max-w-none [&_h2]:font-wd-sans [&_h2]:text-[1.55rem] [&_h2]:font-[650] [&_h2]:tracking-[-0.01em] [&_h3]:text-[1.15rem]"
            >
              {db ? <RichBody doc={db.body} /> : Body ? <Body /> : null}

              <aside
                aria-labelledby="cari-vendor-judul"
                className="mt-12 rounded-[22px] bg-wd-accent-wash p-6 sm:p-8"
              >
                <h2
                  id="cari-vendor-judul"
                  className="wd-title !mt-0 !text-[1.35rem]"
                >
                  Cari vendornya di DuaCincin
                </h2>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-wd-text">
                  Vendor terverifikasi, harga terbuka, pembayaran ditahan DuaCincin
                  sampai acaramu selesai.
                </p>
                {a.categories.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {a.categories.map((c) => (
                    <li key={c}>
                      <Link
                        href={`/kategori/${c}`}
                        className="inline-flex min-h-11 items-center rounded-full border border-wd-accent-line bg-white px-4 text-sm font-semibold text-wd-ink transition-colors hover:border-wd-ink"
                      >
                        {categoryLabel(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
                )}
                <Link
                  href="/register"
                  className={wdButton({ className: "mt-6" })}
                >
                  Buat wedding planner gratis
                </Link>
              </aside>
            </div>
          </div>
        </article>

        <section
          aria-labelledby="baca-juga"
          className="bg-wd-paper py-12 sm:py-16"
        >
          <div className="wd-container">
            <SectionHead
              id="baca-juga"
              title="Baca juga"
              action={<SeeAll href="/artikel">Semua artikel</SeeAll>}
            />
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <li key={o.slug}>
                  <ArticleCard article={o} heading="h3" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
