import { ARTICLES, articleBySlug } from "@/content/artikel/registry";
import { fetchDbArticle } from "@/lib/articles";
import { OG_CONTENT_TYPE, OG_SIZE, renderBrandCard, renderCard } from "@/lib/og";

// Article share preview: the article photo in the brand card, with the title.
export const alt = "Artikel persiapan pernikahan dari DuaCincin";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articleBySlug(slug) ?? (await fetchDbArticle(slug));
  if (!a) return renderBrandCard();
  return renderCard({ kind: "page", title: a.title, line: `Artikel ${a.topic.toLowerCase()} · ${a.readMinutes} menit baca` }, { src: a.image, focusX: 0.5 });
}
