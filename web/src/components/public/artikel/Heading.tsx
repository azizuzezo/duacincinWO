import { Children, isValidElement, type ReactNode } from "react";

import { CopyButton } from "@/components/public/shared/CopyButton";

/** Plain text of a heading's children (MDX headings are plain text). */
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : ""))
    .join("");
}

export function slugify(s: string) {
  return s
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** Article section heading with a stable anchor (from its text) and a "copy
 * link" button that shows on hover / focus (always on touch screens), so a
 * reader can send someone straight to "Rincian biaya", say. The table of
 * contents reads these ids. */
export function ArticleH2({ children, className }: { children?: ReactNode; className: string }) {
  const text = textOf(children);
  const id = slugify(text);
  return (
    <h2 id={id} className={`group/h relative scroll-mt-40 ${className}`}>
      {children}
      <span className="ml-1 inline-block align-middle opacity-100 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/h:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
        <CopyButton hash={id} label={`Salin tautan ke bagian ${text}`} />
      </span>
    </h2>
  );
}
