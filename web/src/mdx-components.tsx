import type { MDXComponents } from "mdx/types";
import Link from "next/link";

import { ArticleH2 } from "@/components/public/artikel/Heading";

// Typography for the articles in src/content/artikel (required by @next/mdx).
// One readable column (~68 characters), the same rhythm as the legal pages.
// Internal links go through next/link; external ones open in a new tab.
const components: MDXComponents = {
  // Section headings carry an anchor and a "copy link" button (ArticleH2).
  h2: ({ children }) => <ArticleH2 className="mt-12 font-heading text-[clamp(1.75rem,3.2vw,2.15rem)] leading-tight text-dc-ink first:mt-0">{children}</ArticleH2>,
  h3: ({ children }) => <h3 className="mt-8 text-lg font-semibold text-dc-ink">{children}</h3>,
  p: ({ children }) => <p className="mt-4 text-[1.0625rem] leading-[1.8] text-dc-text-2">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-[1.0625rem] leading-[1.75] text-dc-text-2 marker:text-dc-gold">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-[1.0625rem] leading-[1.75] text-dc-text-2 marker:font-semibold marker:text-dc-clay">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-dc-ink">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 rounded-r-xl border-l-2 border-dc-gold bg-dc-cream px-5 py-1 [&>p]:text-dc-ink">{children}</blockquote>
  ),
  a: ({ href = "", children }) => {
    const cls = "font-semibold text-dc-clay underline decoration-dc-gold/50 underline-offset-4 hover:text-dc-ink";
    return href.startsWith("/") ? (
      <Link href={href} className={cls}>
        {children}
      </Link>
    ) : (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

export function useMDXComponents(): MDXComponents {
  return components;
}
