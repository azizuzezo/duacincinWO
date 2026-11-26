// The composer's Tiptap setup. What it can produce is exactly what the API
// validator and the public renderer (RichBody) accept: headings 2 to 4,
// lists, quotes, rules, images (width in percent), links, and the marks bold,
// italic, underline, strike, code, highlight and textStyle (font family, size,
// color). Code blocks and H1 are switched off on purpose.
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";

export const FONT_OPTIONS = [
  { value: "Figtree", label: "Figtree (isi)" },
  { value: "Newsreader", label: "Newsreader (judul)" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Arial", label: "Arial" },
  { value: "Courier New", label: "Courier New" },
] as const;

export const SIZE_OPTIONS = [14, 16, 18, 20, 24, 28, 32, 40] as const;

export const TEXT_COLORS = [
  { value: "#231f1d", label: "Hitam kecokelatan" },
  { value: "#85662b", label: "Emas tua" },
  { value: "#c9a45c", label: "Emas" },
  { value: "#a3362a", label: "Merah" },
  { value: "#2f6a47", label: "Hijau" },
  { value: "#1d4e89", label: "Biru" },
  { value: "#756d68", label: "Abu-abu" },
] as const;

export const HIGHLIGHT_COLORS = [
  { value: "#f5ecd9", label: "Krem emas" },
  { value: "#fff3b0", label: "Kuning" },
  { value: "#d8f0dc", label: "Hijau muda" },
  { value: "#fadadd", label: "Merah muda" },
] as const;

/** Image with its width as a percentage of the column (10 to 100), the only size the API accepts. */
const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const n = parseInt(el.getAttribute("data-width") ?? "", 10);
          return n >= 10 && n <= 100 ? n : null;
        },
        renderHTML: (attrs: { width?: number | null }) => (attrs.width ? { "data-width": attrs.width, style: `width:${attrs.width}%` } : {}),
      },
      height: { default: null, renderHTML: () => ({}), parseHTML: () => null },
    };
  },
});

export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      codeBlock: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["mailto"] },
    }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    RichImage.configure({ inline: false }),
    Placeholder.configure({ placeholder: "Mulai menulis. Pakai tombol Gaya di atas untuk judul bagian dan sub judul." }),
  ];
}
