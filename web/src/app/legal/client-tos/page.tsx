import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/landing/LegalPage";

export const metadata: Metadata = { title: "Ketentuan Layanan Client" };

// Clause text unchanged from the reviewed draft; only split into sections.
const SECTIONS: LegalSection[] = [
  {
    id: "transaksi-lewat-platform",
    title: "Transaksi lewat Platform",
    body: (
      <p>
        Client setuju bahwa seluruh komunikasi dan transaksi dengan Vendor yang ditemukan melalui DuaCincin dilakukan lewat Platform, demi
        perlindungan Client sendiri (bukti transaksi, mediasi sengketa, jaminan dana via escrow).
      </p>
    ),
  },
  {
    id: "larangan-mengalihkan",
    title: "Larangan mengalihkan transaksi",
    body: (
      <p>
        Client tidak diperkenankan secara sengaja mengalihkan transaksi ke luar Platform untuk menghindari biaya layanan; pelanggaran berulang
        dapat berdampak pada pembatasan akses akun.
      </p>
    ),
  },
  {
    id: "data-pribadi",
    title: "Data pribadi",
    body: (
      <p>
        Data pribadi Client dikumpulkan dan digunakan sesuai Kebijakan Privasi DuaCincin (mengacu pada UU Pelindungan Data Pribadi).
      </p>
    ),
  },
];

export default function ClientTosPage() {
  return (
    <LegalPage
      title="Ketentuan Layanan Client"
      current="/legal/client-tos"
      intro="Berlaku untuk calon pengantin yang mencari, berdiskusi, dan membayar vendor lewat DuaCincin."
      sections={SECTIONS}
    />
  );
}
