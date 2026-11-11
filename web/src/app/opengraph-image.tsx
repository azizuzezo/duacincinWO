import { OG_CONTENT_TYPE, OG_SIZE, renderBrandCard } from "@/lib/og";

// Site-wide share preview (WhatsApp, X, Facebook...). Pages without their own
// opengraph-image inherit this one. Card design lives in src/lib/og.tsx.
export const alt = "DuaCincin: pengantin Melayu Deli di Istana Maimun, dengan logo dan tulisan Hari bahagia kalian, disiapkan tanpa was-was";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderBrandCard();
}
