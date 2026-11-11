import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from "@/lib/og";

// Share preview for this page: the DuaCincin card with the page's own title.
export const alt = "DuaCincin, cara kerja: pasangan pengantin Sunda di bingkai lengkung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCard(
    {
      kind: "page",
      title: "Dari pilih vendor sampai hari-H",
      line: "Pembayaranmu ditahan escrow dan baru diteruskan ke vendor setelah acara selesai.",
    },
    { src: "/photos/momen/sunda-lengkung-1000.webp", focusX: 0.5 },
  );
}
