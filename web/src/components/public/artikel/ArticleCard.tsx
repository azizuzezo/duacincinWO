import Image from "next/image";
import Link from "next/link";

import { formatArticleDate, type Article } from "@/content/artikel/registry";

/** One article in the /artikel list and under "Baca juga". The whole card is
 * the link; the title carries the accessible name. `heading` keeps the outline
 * right: h2 on the index, h3 under the "Baca juga" heading. */
export function ArticleCard({ article, priority = false, heading: H = "h2" }: { article: Article; priority?: boolean; heading?: "h2" | "h3" }) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-dc-line bg-dc-white transition-[border-color,box-shadow] duration-300 hover:border-dc-ink hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-dc-cream">
        <Image
          src={article.image}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-dc group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dc-clay">{article.topic}</p>
        <H className="mt-2 font-heading text-[1.6rem] leading-tight text-dc-ink">{article.title}</H>
        <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-dc-text-2">{article.description}</p>
        <p className="mt-auto pt-4 text-sm text-dc-text-3">
          {formatArticleDate(article.updated ?? article.published)} · {article.readMinutes} menit baca
        </p>
      </div>
    </Link>
  );
}
