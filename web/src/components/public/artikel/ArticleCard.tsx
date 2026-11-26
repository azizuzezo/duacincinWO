import Image from "next/image";
import Link from "next/link";

import { ShareButton } from "@/components/public/shared/ShareButton";
import { LIFT, ZOOM } from "@/components/public/shared/styles";
import { formatArticleDate, type Article } from "@/content/artikel/registry";

/** One article card (blog grid and "Baca juga"), marketplace style: photo
 * with the topic as a small badge and a share button, title, date and read
 * time, then a "Baca" link. The title link stretches over the whole card
 * (one tab stop for the card, plus the share button); the card lifts and
 * the photo leans in on hover. `heading` keeps the outline right. */
export function ArticleCard({ article, priority = false, heading: H = "h2" }: { article: Article; priority?: boolean; heading?: "h2" | "h3" }) {
  const href = `/artikel/${article.slug}`;
  return (
    <article className={`group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-wd-line bg-white focus-within:border-wd-accent-line hover:border-wd-line-2 ${LIFT}`}>
      <span className="relative block aspect-[4/3] overflow-hidden bg-wd-blush">
        <Image src={article.image} alt="" fill priority={priority} unoptimized={article.image.startsWith("http")} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className={ZOOM} />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-wd-accent-ink shadow-wd-card">{article.topic}</span>
      </span>
      <div className="flex flex-1 flex-col p-5">
        <H className="line-clamp-3 text-[1.1rem] font-semibold leading-snug text-wd-ink transition-colors group-hover:text-wd-accent-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none after:focus-visible:rounded-[20px] after:focus-visible:outline-2 after:focus-visible:outline-offset-[-2px] after:focus-visible:outline-wd-accent-ink">
            {article.title}
          </Link>
        </H>
        <span className="mt-2 block text-sm text-wd-muted">
          {formatArticleDate(article.updated ?? article.published)} · {article.readMinutes} menit baca
        </span>
        <span aria-hidden className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-wd-ink">
          Baca
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      {/* Above the stretched link, so it stays its own button. */}
      <ShareButton path={href} title={article.title} className="absolute right-3 top-3 z-10" />
    </article>
  );
}

/** The newest article, wide: photo left, text right (stacked on phones). */
export function FeaturedArticle({ article }: { article: Article }) {
  const href = `/artikel/${article.slug}`;
  return (
    <article className="group relative grid items-center gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
      <span className={`relative block aspect-[4/3] overflow-hidden rounded-[24px] bg-wd-blush lg:aspect-[16/10] ${LIFT} group-hover:-translate-y-1 group-hover:shadow-wd-lift`}>
        <Image src={article.image} alt="" fill priority unoptimized={article.image.startsWith("http")} sizes="(min-width: 1024px) 700px, 100vw" className={ZOOM} />
        <span className="absolute left-4 top-4 rounded-full bg-wd-accent px-3 py-1 text-xs font-semibold text-wd-ink">Terbaru</span>
      </span>
      <span className="block">
        <span className="text-sm font-semibold text-wd-accent-ink">{article.topic}</span>
        <h2 className="wd-title mt-2 text-[clamp(1.5rem,2.6vw,2.1rem)] leading-tight transition-colors group-hover:text-wd-accent-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none after:focus-visible:rounded-[24px] after:focus-visible:outline-2 after:focus-visible:outline-offset-4 after:focus-visible:outline-wd-accent-ink">
            {article.title}
          </Link>
        </h2>
        <span className="mt-3 line-clamp-3 block max-w-[56ch] leading-relaxed text-wd-text">{article.description}</span>
        <span className="mt-4 block text-sm text-wd-muted">
          {formatArticleDate(article.updated ?? article.published)} · {article.readMinutes} menit baca
        </span>
        <span className="pointer-events-none relative z-10 mt-5 flex flex-wrap items-center gap-3">
          <span aria-hidden className="inline-flex min-h-11 items-center gap-2 rounded-full bg-wd-ink px-5 text-sm font-semibold text-white transition-colors group-hover:bg-black">
            Baca artikel
          </span>
          <ShareButton path={href} title={article.title} variant="pill" className="pointer-events-auto" />
        </span>
      </span>
    </article>
  );
}
