/** A category x city page is worth a search result only with a real choice
 * of vendors; below this it stays open to visitors but is noindex and left
 * out of the sitemap. */
export const MIN_VENDORS_TO_INDEX = 3;

/** Categories whose page carries a full buying guide of its own (see
 * components/vendor/directory/categoryGuides.ts), so it is worth indexing
 * even before a vendor lists in it. Every other empty category page is a
 * template with no vendors: noindex and out of the sitemap until one joins. */
export const GUIDED_CATEGORIES = ["decor", "venue"] as const;

/** Is /kategori/[kategori] worth a search result right now? */
export function categoryIsIndexable(category: string, vendorCount: number): boolean {
  return vendorCount > 0 || (GUIDED_CATEGORIES as readonly string[]).includes(category);
}

/** Page title for a category: the long form while the whole title (plus the
 * " | DuaCincin" suffix) fits a search result, the short form otherwise. */
export function categoryTitle(label: string): string {
  const long = `Vendor ${label} Pernikahan Terverifikasi`;
  return long.length <= 48 ? long : `Vendor ${label} Terverifikasi`;
}
