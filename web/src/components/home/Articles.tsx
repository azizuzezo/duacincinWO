"use client";

// Newest guides from /artikel as a draggable card rail (marketplace
// "Articles" pattern): photo, topic, date, title, a two-line teaser, "Baca"
// and a share button that really shares (the phone's share sheet, or the
// link copied with a toast). Static data: the registry lives in the repo.
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { useToast } from "@/components/ui/Toast";
import { ARTICLES, formatArticleDate, type Article } from "@/content/artikel/registry";

import { RailArrows } from "./RailArrows";
import { SectionHead, SeeAll } from "./ui";
import { useDragScroll } from "./useDragScroll";

const COUNT = 8;

function ShareButton({ a }: { a: Article }) {
  const { show } = useToast();
  async function share() {
    const url = `${window.location.origin}/artikel/${a.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: a.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      show("Tautan artikel disalin.", "success");
    } catch (err) {
      // The visitor closed the share sheet: nothing to report.
      if ((err as DOMException)?.name !== "AbortError") show("Tautan belum bisa disalin.", "danger");
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      aria-label={`Bagikan artikel: ${a.title}`}
      className="flex h-11 w-11 items-center justify-center rounded-full text-wd-muted transition-colors hover:bg-wd-accent-wash hover:text-wd-accent-ink"
    >
      <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
      </svg>
    </button>
  );
}

function Card({ a }: { a: Article }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[18px] border border-wd-line bg-white transition-[box-shadow,transform] duration-300 hover:shadow-wd-lift motion-safe:hover:-translate-y-1">
      <div className="relative block aspect-[4/3] overflow-hidden bg-wd-blush">
        <Image src={a.image} alt="" fill draggable={false} unoptimized={a.image.startsWith("http")} sizes="300px" className="object-cover transition-transform duration-700 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-wd-accent-ink">{a.topic}</span>
          <span className="text-wd-muted">{formatArticleDate(a.updated ?? a.published)}</span>
        </p>
        <h3 className="mt-2 line-clamp-2 text-[1.02rem] font-semibold leading-snug text-wd-ink">
          {/* The title link covers the whole card; the buttons below sit above it. */}
          <Link href={`/artikel/${a.slug}`} draggable={false} className="after:absolute after:inset-0 after:rounded-[18px]">
            {a.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-[0.88rem] leading-relaxed text-wd-text">{a.description}</p>
        <div className="relative z-10 mt-auto flex items-center justify-between pt-3">
          <ShareButton a={a} />
          <span aria-hidden className="inline-flex min-h-10 items-center rounded-full bg-wd-accent px-4 text-sm font-semibold text-wd-ink transition-colors group-hover:bg-wd-accent-deep">
            Baca
          </span>
        </div>
      </div>
    </article>
  );
}

export function Articles() {
  const rail = useRef<HTMLUListElement>(null);
  useDragScroll(rail);
  const list = ARTICLES.slice(0, COUNT);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="artikel-judul" className="bg-wd-paper py-12 sm:py-16">
      <div className="wd-container">
        <Reveal>
          <SectionHead
            id="artikel-judul"
            title={
              <>
                Panduan <em>persiapan pernikahan</em>
              </>
            }
            sub="Checklist, anggaran, sampai ragam adat."
            action={
              <div className="flex items-center gap-4">
                <SeeAll href="/artikel">Semua artikel</SeeAll>
                <div className="hidden lg:block">
                  <RailArrows rail={rail} label="Artikel" />
                </div>
              </div>
            }
          />
        </Reveal>
        <ul ref={rail} className="wd-rail -mx-1 mt-6 flex gap-4 overflow-x-auto px-1 pb-2 lg:gap-5">
          {list.map((a) => (
            <li key={a.slug} className="w-[74vw] max-w-[300px] shrink-0 sm:w-[calc((100%-2*16px)/2.4)] lg:w-[calc((100%-3*20px)/4)] lg:max-w-none">
              <Card a={a} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
