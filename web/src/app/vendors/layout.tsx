import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Direktori Vendor", template: "%s | DuaCincin" },
  description:
    "Cari vendor pernikahan terverifikasi per kategori dan kota: lihat portofolio, bandingkan harga mulai dari, lalu ngobrol dan booking lewat DuaCincin.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
