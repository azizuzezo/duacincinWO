// Articles written in the admin panel (stored in the database), read on the
// server for the public pages. They sit beside the static MDX articles in
// src/content/artikel/registry.ts: allArticles() merges both, newest first.
// Every fetch is cached for 2 minutes and gives up after 5 seconds; on any
// failure the DB articles are simply missing and the static ones still show.
import { ARTICLES, type Article } from "@/content/artikel/registry";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** A ProseMirror document as stored by the composer (validated by the API). */
export type RichNode = { type: string; attrs?: Record<string, unknown>; content?: RichNode[]; marks?: { type: string; attrs?: Record<string, unknown> }[]; text?: string };
export type RichDoc = { type: "doc"; content?: RichNode[] };

type Wire = {
  id: string;
  slug: string;
  title: string;
  description: string;
  topic: string;
  cover_url: string;
  cover_alt: string;
  status: "draft" | "published";
  author_name: string;
  reading_minutes: number;
  published_at: string | null;
  updated_at: string;
  body?: RichDoc;
};

export type DbArticle = Article & { author: string; body: RichDoc };

/** "2026-11-26" in Jakarta time, the date format the static registry uses. */
function day(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

function toArticle(w: Wire): Article {
  const published = day(w.published_at ?? w.updated_at);
  const updated = day(w.updated_at);
  return {
    slug: w.slug,
    title: w.title,
    description: w.description,
    topic: w.topic || "Panduan",
    published,
    updated: updated !== published ? updated : undefined,
    image: w.cover_url,
    imageAlt: w.cover_alt || w.title,
    readMinutes: w.reading_minutes || 1,
    categories: [],
  };
}

export async function fetchDbArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles?limit=100`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const list = ((await res.json()) as Wire[] | null) ?? [];
    return list.filter((a) => a.cover_url).map(toArticle);
  } catch {
    return [];
  }
}

export async function fetchDbArticle(slug: string): Promise<DbArticle | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/${encodeURIComponent(slug)}`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const w = (await res.json()) as Wire | null;
    if (!w?.slug || !w.body) return null;
    return { ...toArticle(w), author: w.author_name || "Tim DuaCincin", body: w.body };
  } catch {
    return null;
  }
}

/** Static and admin-written articles together, newest first. */
export async function allArticles(): Promise<Article[]> {
  const db = await fetchDbArticles();
  const slugs = new Set(ARTICLES.map((a) => a.slug));
  return [...ARTICLES, ...db.filter((a) => !slugs.has(a.slug))].sort((a, b) => (b.updated ?? b.published).localeCompare(a.updated ?? a.published) || b.published.localeCompare(a.published));
}
