import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/LegalPage";

export const metadata: Metadata = { title: "Perjanjian Vendor" };

export default function VendorAgreementPage() {
  return (
    <LegalPage title="Perjanjian Kemitraan Vendor DuaCincin">
<ol className="flex flex-col gap-5 leading-relaxed text-dc-ink/85 [&>li]:border-t [&>li]:border-dc-ink/10 [&>li]:pt-5">
        <li>
          <strong>1. Definisi:</strong> &quot;Platform&quot; berarti aplikasi dan situs DuaCincin. &quot;Mitra Vendor&quot; berarti
          pihak penyedia jasa yang telah disetujui mendaftar di Platform. &quot;Transaksi Difasilitasi&quot; berarti setiap
          transaksi jasa pernikahan yang bermula dari pertemuan, diskusi, atau paparan yang terjadi di Platform.
        </li>
        <li>
          <strong>2. Kewajiban Mitra Vendor:</strong> memproses seluruh komunikasi, negosiasi, dan pembayaran Transaksi
          Difasilitasi melalui fitur Platform (chat in-app, sistem booking, dan sistem pembayaran/escrow).
        </li>
        <li>
          <strong>3. Larangan Transaksi di Luar Platform:</strong> Mitra Vendor dilarang mengarahkan Client berkomunikasi/
          bertransaksi di luar Platform, memberi insentif untuk berpindah keluar Platform, atau menyembunyikan laporan
          transaksi untuk menghindari komisi.
        </li>
        <li>
          <strong>4. Sanksi &amp; Penalti:</strong> pelanggaran dikenakan sanksi bertingkat: peringatan tertulis, lalu
          penangguhan akun 30 hari, lalu pemutusan mitra permanen, tanpa mengurangi hak DuaCincin menempuh upaya hukum perdata.
        </li>
        <li>
          <strong>5. Kerahasiaan:</strong> Mitra Vendor menjaga kerahasiaan data Client yang diperoleh lewat Platform.
        </li>
        <li>
          <strong>6. Komisi:</strong> DuaCincin berhak atas komisi dari setiap Transaksi Difasilitasi yang berhasil,
          dipotong otomatis saat disbursement.
        </li>
        <li>
          <strong>7. Penyelesaian Sengketa:</strong> diselesaikan lebih dahulu secara musyawarah lewat mekanisme dispute
          internal DuaCincin, sesuai hukum yang berlaku di Indonesia.
        </li>
        <li>
          <strong>8. Persetujuan Elektronik:</strong> persetujuan dilakukan secara elektronik dan memiliki kekuatan hukum
          sah sesuai UU ITE, dicatat dengan timestamp dan versi dokumen sebagai alat bukti.
        </li>
      </ol>
    </LegalPage>
  );
}
