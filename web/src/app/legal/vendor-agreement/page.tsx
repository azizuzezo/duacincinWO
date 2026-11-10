import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/landing/LegalPage";

export const metadata: Metadata = { title: "Perjanjian Vendor" };

// Clause text unchanged from the reviewed draft (PRD §8.6); only split into
// sections with their own anchors so the table of contents can link to them.
const SECTIONS: LegalSection[] = [
  {
    id: "definisi",
    title: "Definisi",
    body: (
      <p>
        &quot;Platform&quot; berarti aplikasi dan situs DuaCincin. &quot;Mitra Vendor&quot; berarti pihak penyedia jasa yang telah disetujui
        mendaftar di Platform. &quot;Transaksi Difasilitasi&quot; berarti setiap transaksi jasa pernikahan yang bermula dari pertemuan, diskusi,
        atau paparan yang terjadi di Platform.
      </p>
    ),
  },
  {
    id: "kewajiban",
    title: "Kewajiban Mitra Vendor",
    body: (
      <p>
        Memproses seluruh komunikasi, negosiasi, dan pembayaran Transaksi Difasilitasi melalui fitur Platform (chat in-app, sistem booking, dan
        sistem pembayaran/escrow).
      </p>
    ),
  },
  {
    id: "larangan",
    title: "Larangan Transaksi di Luar Platform",
    body: (
      <p>
        Mitra Vendor dilarang mengarahkan Client berkomunikasi/bertransaksi di luar Platform, memberi insentif untuk berpindah keluar Platform,
        atau menyembunyikan laporan transaksi untuk menghindari komisi.
      </p>
    ),
  },
  {
    id: "sanksi",
    title: "Sanksi dan Penalti",
    body: (
      <p>
        Pelanggaran dikenakan sanksi bertingkat: peringatan tertulis, lalu penangguhan akun 30 hari, lalu pemutusan mitra permanen, tanpa
        mengurangi hak DuaCincin menempuh upaya hukum perdata.
      </p>
    ),
  },
  {
    id: "kerahasiaan",
    title: "Kerahasiaan",
    body: <p>Mitra Vendor menjaga kerahasiaan data Client yang diperoleh lewat Platform.</p>,
  },
  {
    id: "komisi",
    title: "Komisi",
    body: <p>DuaCincin berhak atas komisi dari setiap Transaksi Difasilitasi yang berhasil, dipotong otomatis saat disbursement.</p>,
  },
  {
    id: "sengketa",
    title: "Penyelesaian Sengketa",
    body: (
      <p>
        Diselesaikan lebih dahulu secara musyawarah lewat mekanisme dispute internal DuaCincin, sesuai hukum yang berlaku di Indonesia.
      </p>
    ),
  },
  {
    id: "persetujuan-elektronik",
    title: "Persetujuan Elektronik",
    body: (
      <p>
        Persetujuan dilakukan secara elektronik dan memiliki kekuatan hukum sah sesuai UU ITE, dicatat dengan timestamp dan versi dokumen
        sebagai alat bukti.
      </p>
    ),
  },
];

export default function VendorAgreementPage() {
  return (
    <LegalPage
      title="Perjanjian Kemitraan Vendor DuaCincin"
      current="/legal/vendor-agreement"
      intro="Kamu menyetujui perjanjian ini saat mendaftar sebagai vendor. Versi dan waktu persetujuanmu dicatat."
      sections={SECTIONS}
    />
  );
}
