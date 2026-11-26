import Link from "next/link";
import type { ReactNode } from "react";

import { ArticleH2, slugify } from "@/components/public/artikel/Heading";
import type { RichDoc, RichNode } from "@/lib/articles";

// Renders an article written in the admin composer (a ProseMirror document).
// Only the node and mark types the API accepts are mapped; anything else
// renders as nothing, and links/images are checked again here, so a document
// can never inject markup. Typography matches the MDX articles.

const ALIGN = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" } as const;
const FONTS = new Set(["Figtree", "Newsreader", "Georgia", "Times New Roman", "Arial", "Courier New"]);
const FONT_STACK: Record<string, string> = {
  Figtree: "var(--font-wd-sans-face), ui-sans-serif, sans-serif",
  Newsreader: "var(--font-wd-display-face), Georgia, serif",
};
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SIZE = /^(\d{2})px$/;

function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  return /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : null;
}

function textOf(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join("");
}

function alignClass(node: RichNode): string {
  const a = node.attrs?.textAlign;
  return typeof a === "string" && a in ALIGN ? ALIGN[a as keyof typeof ALIGN] : "";
}

function renderText(node: RichNode, key: string): ReactNode {
  let out: ReactNode = node.text ?? "";
  const style: React.CSSProperties = {};
  for (const mark of node.marks ?? []) {
    const attrs = mark.attrs ?? {};
    switch (mark.type) {
      case "bold":
        out = <strong className="font-semibold text-wd-ink">{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u className="underline-offset-4">{out}</u>;
        break;
      case "strike":
        out = <s>{out}</s>;
        break;
      case "code":
        out = <code className="rounded bg-wd-blush px-1.5 py-0.5 font-mono text-[0.9em]">{out}</code>;
        break;
      case "highlight":
        out = <mark className="rounded px-0.5" style={{ backgroundColor: typeof attrs.color === "string" && HEX.test(attrs.color) ? attrs.color : "#f5ecd9" }}>{out}</mark>;
        break;
      case "link": {
        const href = safeHref(attrs.href);
        if (!href) break;
        const cls = "font-semibold text-wd-accent-ink underline decoration-wd-accent-line underline-offset-4 hover:text-wd-ink";
        out = href.startsWith("/") ? (
          <Link href={href} className={cls}>
            {out}
          </Link>
        ) : (
          <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
            {out}
          </a>
        );
        break;
      }
      case "textStyle": {
        if (typeof attrs.fontFamily === "string" && FONTS.has(attrs.fontFamily)) style.fontFamily = FONT_STACK[attrs.fontFamily] ?? `"${attrs.fontFamily}", serif`;
        if (typeof attrs.fontSize === "string" && SIZE.test(attrs.fontSize)) style.fontSize = attrs.fontSize;
        if (typeof attrs.color === "string" && HEX.test(attrs.color)) style.color = attrs.color;
        break;
      }
    }
  }
  if (Object.keys(style).length) out = <span style={style}>{out}</span>;
  return <span key={key} className="contents">{out}</span>;
}

function renderChildren(node: RichNode, path: string): ReactNode {
  return (node.content ?? []).map((c, i) => renderNode(c, `${path}.${i}`));
}

function renderNode(node: RichNode, path: string): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, path);
    case "hardBreak":
      return <br key={path} />;
    case "paragraph":
      return (
        <p key={path} className={`mt-4 min-h-[1.8em] text-[1.0625rem] leading-[1.8] text-wd-text ${alignClass(node)}`}>
          {renderChildren(node, path)}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level);
      const text = textOf(node);
      const cls = alignClass(node);
      if (level === 2)
        return (
          <ArticleH2 key={path} className={`mt-12 font-wd-sans text-[1.55rem] font-[650] leading-tight tracking-[-0.01em] text-wd-ink first:mt-0 ${cls}`}>
            {renderChildren(node, path)}
          </ArticleH2>
        );
      if (level === 3)
        return (
          <h3 key={path} id={slugify(text) || undefined} className={`mt-8 scroll-mt-40 text-[1.15rem] font-semibold text-wd-ink ${cls}`}>
            {renderChildren(node, path)}
          </h3>
        );
      return (
        <h4 key={path} className={`mt-6 text-base font-semibold text-wd-ink ${cls}`}>
          {renderChildren(node, path)}
        </h4>
      );
    }
    case "bulletList":
      return (
        <ul key={path} className="mt-4 list-disc space-y-2 pl-6 text-[1.0625rem] leading-[1.75] text-wd-text marker:text-wd-gold">
          {renderChildren(node, path)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={path} className="mt-4 list-decimal space-y-2 pl-6 text-[1.0625rem] leading-[1.75] text-wd-text marker:font-semibold marker:text-wd-accent-ink">
          {renderChildren(node, path)}
        </ol>
      );
    case "listItem":
      return (
        <li key={path} className="pl-1 [&>p]:mt-0">
          {renderChildren(node, path)}
        </li>
      );
    case "blockquote":
      return (
        <blockquote key={path} className="mt-6 rounded-r-xl border-l-2 border-wd-gold bg-wd-accent-wash px-5 py-1 [&>p]:text-wd-ink">
          {renderChildren(node, path)}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={path} className="my-10 border-wd-line" />;
    case "image": {
      const src = node.attrs?.src;
      if (typeof src !== "string" || !/^(https:\/\/|\/)/.test(src)) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const w = Number(node.attrs?.width);
      const width = w >= 10 && w <= 100 ? `${w}%` : "100%";
      const align = alignClass(node);
      return (
        <figure key={path} className={`mt-8 ${align === "text-center" ? "mx-auto" : align === "text-right" ? "ml-auto" : ""}`} style={{ width }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded photos of any size, served from the storage CDN */}
          <img src={src} alt={alt} loading="lazy" decoding="async" className="h-auto w-full rounded-[18px]" />
          {typeof node.attrs?.title === "string" && node.attrs.title ? <figcaption className="mt-2 text-center text-sm text-wd-muted">{node.attrs.title}</figcaption> : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

export function RichBody({ doc }: { doc: RichDoc }) {
  return <>{(doc.content ?? []).map((n, i) => renderNode(n, String(i)))}</>;
}
