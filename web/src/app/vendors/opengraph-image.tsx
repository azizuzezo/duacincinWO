import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from "@/lib/og";

// Share preview for this page: the DuaCincin card with the page's own title.
export const alt = "DuaCincin, direktori vendor pernikahan: pelaminan adat berukir emas";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCard(
    {
      kind: "page",
      title: "Direktori vendor pernikahan",
      line: "Bandingkan portofolio dan harga mulai dari, lalu ngobrol langsung dengan vendornya.",
    },
    { src: "/photos/kategori/dekorasi-1400.webp", focusX: 0.5 },
  );
}
