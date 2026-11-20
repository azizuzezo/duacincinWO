import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/landing/PublicShell";
import { ArticleCard } from "@/components/public/artikel/ArticleCard";
import { breadcrumbLd, JsonLd, ORGANIZATION_LD, ORGANIZATION_REF } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { ARTICLES, articleBySlug, formatArticleDate } from "@/content/artikel/registry";
import { categoryLabel } from "@/lib/api";
import { OPEN_GRAPH_BASE, SITE_URL } from "@/lib/site";

const LINK = "font-semibold text-dc-clay underline decoration-dc-gold/60 underline-offset-4 hover:text-dc-ink";

// Every article is known at build time (src/content/artikel/registry.ts), so
// the pages are static and an unknown slug is a 404.
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/artikel/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = articleBySlug(slug);
  if (!a) return {};
  const url = `/artikel/${a.slug}`;
  return {
    title: a.title,
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
    twitter: { card: "summary_large_image", title: a.title, description: a.description },
  };
}

export default async function ArtikelPage({ params }: PageProps<"/artikel/[slug]">) {
  const { slug } = await params;
  const a = articleBySlug(slug);
  if (!a) notFound();
  const { default: Body } = await import(`@/content/artikel/${a.slug}.mdx`);
  const url = `${SITE_URL}/artikel/${a.slug}`;
  const others = ARTICLES.filter((o) => o.slug !== a.slug).slice(0, 3);
  const crumbs = [
    { name: "Artikel", path: "/artikel" },
    { name: a.title, path: `/artikel/${a.slug}` },
  ];
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    description: a.description,
    image: [`${SITE_URL}${a.image}`],
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
    <PublicShell overlay={false}>
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <article>
        <header className="dc-grain border-b border-dc-line bg-dc-cream">
          <div className="dc-container grid gap-8 py-10 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-14">
            <div className="lg:col-span-7">
              <nav aria-label="Jalur halaman" className="text-sm text-dc-text-2">
                <ol className="flex flex-wrap items-center gap-x-2">
                  <li>
                    <Link href="/artikel" className={`inline-flex min-h-11 items-center ${LINK}`}>
                      Artikel
                    </Link>
                  </li>
                  <li aria-hidden className="text-dc-text-3">
                    /
                  </li>
                  <li aria-current="page">{a.topic}</li>
                </ol>
              </nav>
              <h1 className="mt-4 font-heading text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.04] text-dc-ink">{a.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dc-text-2">{a.description}</p>
              <p className="mt-6 text-sm text-dc-text-2">
                Tim DuaCincin · {a.updated ? "Diperbarui " : ""}<time dateTime={a.updated ?? a.published}>{formatArticleDate(a.updated ?? a.published)}</time> · {a.readMinutes} menit baca
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-dc-ivory shadow-float lg:col-span-5 lg:aspect-[4/5]">
              <Image src={a.image} alt={a.imageAlt} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
        </header>

        <div className="dc-container grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 max-w-[68ch] lg:col-span-8">
            <Body />
          </div>

          <aside aria-labelledby="cari-vendor-judul" className="lg:col-span-4">
            <div className="rounded-2xl border border-dc-line bg-dc-white p-6 lg:sticky lg:top-28">
              <h2 id="cari-vendor-judul" className="font-heading text-2xl text-dc-ink">
                Cari vendornya di DuaCincin
              </h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-dc-text-2">Vendor terverifikasi, harga terbuka, dan pembayaran ditahan escrow sampai acaramu selesai.</p>
              <ul className="mt-4 space-y-1">
                {a.categories.map((c) => (
                  <li key={c}>
                    <Link href={`/kategori/${c}`} className={`inline-flex min-h-11 items-center ${LINK}`}>
                      Vendor {categoryLabel(c)}
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" variant="gold" block className="mt-5">
                Buat wedding planner gratis
              </ButtonLink>
            </div>
          </aside>
        </div>
      </article>

      <section aria-labelledby="baca-juga" className="border-t border-dc-line bg-dc-cream">
        <div className="dc-container py-12 sm:py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="baca-juga" className="font-heading text-[clamp(1.9rem,3.5vw,2.6rem)] text-dc-ink">
              Baca juga
            </h2>
            <Link href="/artikel" className={`inline-flex min-h-11 items-center ${LINK}`}>
              Semua artikel
            </Link>
          </div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.slug}>
                <ArticleCard article={o} heading="h3" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PublicShell>
  );
}
