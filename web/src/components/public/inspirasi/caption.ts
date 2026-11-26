/** Inspiration captions come from Pinterest: long, full of #hashtags, @mentions
 * and credits. For a card or a heading we keep only the first clean sentence
 * (no tags, mentions or links), cut at a word boundary. The full caption is
 * still shown when a photo is opened (Lightbox). */
export function shortCaption(raw: string | undefined | null, fallback = "Inspirasi pernikahan", max = 90): string {
  const clean = (raw ?? "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#@][\w.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return fallback;
  const sentence = clean.match(/^(.+?[.!?])(\s|$)/);
  let s = sentence ? sentence[1] : clean;
  if (s.length > max) {
    const cut = s.slice(0, max);
    s = (cut.lastIndexOf(" ") > 20 ? cut.slice(0, cut.lastIndexOf(" ")) : cut).replace(/[,;:\s.]+$/, "") + "…";
  }
  return s;
}
