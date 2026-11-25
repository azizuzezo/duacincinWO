import { HomeNav } from "@/components/home/HomeNav";

/** Public header. Since the "Putih" redesign (Nov 2026) every public page
 * uses the marketplace header (components/home/HomeNav); `overlay` is kept
 * so existing callers compile, and is ignored (the header is always solid). */
export function Navbar(props: { overlay?: boolean }) {
  void props;
  return <HomeNav />;
}
