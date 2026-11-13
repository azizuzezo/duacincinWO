import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from "@/lib/og";

// Share preview for this page: the DuaCincin card with the page's own title.
export const alt = "DuaCincin, bantuan: gedung resepsi dengan lampu gantung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderCard(
    {
      kind: "page",
      title: "Bantuan dan pertanyaan umum",
      line: "Jawaban soal escrow, booking, sengketa, dan akun vendor.",
    },
    { src: "/photos/pinterest/pendopo-kursi-tamu.webp", focusX: 0.5 },
  );
}
