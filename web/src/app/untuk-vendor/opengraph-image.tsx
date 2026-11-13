import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from "@/lib/og";

// Share preview for this page: the DuaCincin card with the page's own title.
export const alt = "DuaCincin untuk vendor: potret pengantin Bali bermahkota emas";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCard(
    {
      kind: "page",
      title: "Untuk vendor pernikahan",
      line: "Tampilkan portofolio, terima booking lewat chat, dan terima pembayaran setelah acara selesai.",
    },
    { src: "/photos/pinterest/foto-gapura.webp", focusX: 0.5 },
  );
}
