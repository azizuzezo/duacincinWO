import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/landing/LegalPage";
import { COMPANY, COMPANY_PAGE } from "@/lib/company";

export const metadata: Metadata = {
  title: "Ketentuan Layanan Client",
  description: `Ketentuan layanan bagi calon pengantin yang mencari, memesan, dan membayar vendor pernikahan lewat DuaCincin, diselenggarakan ${COMPANY.name}.`,
};

// Text in force at LEGAL_VERSION (lib/legal.ts). Any material change needs a
// new version there and in the server's CurrentAgreementVersion.
const ol = "mt-3 list-decimal space-y-2 pl-6 marker:text-dc-clay";
const ola = "mt-2 list-[lower-alpha] space-y-1.5 pl-6";

const SECTIONS: LegalSection[] = [
  {
    id: "penyelenggara",
    title: "Penyelenggara dan persetujuan",
    body: (
      <ol className={ol}>
        <li>
          DuaCincin diselenggarakan oleh <strong>{COMPANY.name}</strong>, pemegang NIB {COMPANY.nib} dan tanda daftar Penyelenggara Sistem
          Elektronik lingkup privat nomor {COMPANY.pseNumber} (&quot;DuaCincin&quot;). Data lengkap perseroan ada di halaman{" "}
          <Link href={COMPANY_PAGE}>Informasi perusahaan</Link>.
        </li>
        <li>
          Dengan membuat akun client, kamu menyatakan telah membaca, memahami, dan menyetujui Ketentuan Layanan ini. Persetujuan tersebut merupakan
          kontrak elektronik yang sah menurut Undang-Undang Nomor 11 Tahun 2008 tentang Informasi dan Transaksi Elektronik beserta perubahannya dan
          Peraturan Pemerintah Nomor 80 Tahun 2019 tentang Perdagangan Melalui Sistem Elektronik. DuaCincin menyimpan catatan waktu dan versi yang
          kamu setujui.
        </li>
        <li>
          Kamu menyatakan telah dewasa dan cakap melakukan perbuatan hukum. Melihat direktori dan profil vendor tidak memerlukan akun.
        </li>
      </ol>
    ),
  },
  {
    id: "layanan",
    title: "Layanan DuaCincin",
    body: (
      <ol className={ol}>
        <li>
          DuaCincin menyediakan tempat untuk mencari dan membandingkan vendor pernikahan, bercakap dengan vendor dan wedding consultant, mengajukan
          booking, membayar melalui rekening penampung, serta alat perencanaan seperti daftar tamu, rundown, denah meja, dan anggaran.
        </li>
        <li>
          Jasa pernikahan dilaksanakan oleh vendor sebagai pelaku usaha yang mandiri. DuaCincin memverifikasi vendor sebelum tampil di direktori,
          menyimpan pembayaranmu sampai acara selesai, dan menengahi bila terjadi sengketa, tetapi bukan pihak pelaksana jasa.
        </li>
        <li>
          Wedding consultant adalah staf DuaCincin yang membantu memberi rekomendasi. Menggunakan wedding consultant bersifat pilihan dan keputusan
          memilih vendor tetap ada padamu.
        </li>
      </ol>
    ),
  },
  {
    id: "akun",
    title: "Akun",
    body: (
      <ol className={ol}>
        <li>Data yang kamu berikan harus benar dan terbaru.</li>
        <li>
          Kamu bertanggung jawab menjaga kerahasiaan kata sandi dan atas kegiatan yang dilakukan melalui akunmu. Segera beri tahu kami bila akunmu
          dipakai tanpa izin.
        </li>
        <li>Kamu dapat meminta penutupan akun kapan saja melalui pusat bantuan, setelah booking yang sedang berjalan selesai atau dibatalkan.</li>
      </ol>
    ),
  },
  {
    id: "booking-pembayaran",
    title: "Booking dan pembayaran",
    body: (
      <ol className={ol}>
        <li>
          Harga, tanggal, dan isi paket disepakati antara kamu dan vendor, lalu dicatat dalam booking. Booking berlaku setelah vendor
          mengonfirmasinya.
        </li>
        <li>
          Setelah booking dikonfirmasi, kamu membayar uang muka (DP) sebesar 30% (tiga puluh persen) dari harga yang disepakati, lalu melunasi
          sisanya sebelum technical meeting. Rincian biaya ditampilkan sebelum kamu membayar.
        </li>
        <li>
          Seluruh pembayaran disimpan di rekening penampung DuaCincin dan baru diteruskan ke vendor setelah kamu mengonfirmasi acara selesai.
          Komisi DuaCincin dibayar oleh vendor dan tidak ditambahkan ke tagihanmu.
        </li>
        <li>
          Konfirmasi acara selesai hanya kamu berikan bila jasa telah dilaksanakan sesuai kesepakatan. Bila ada keberatan, ajukan sengketa sebelum
          mengonfirmasi.
        </li>
      </ol>
    ),
  },
  {
    id: "transaksi-lewat-platform",
    title: "Transaksi melalui DuaCincin",
    body: (
      <>
        <p>
          Demi perlindunganmu, percakapan dan pembayaran dengan vendor yang kamu temukan di DuaCincin dilakukan melalui DuaCincin. Pembayaran di luar
          DuaCincin tidak dilindungi rekening penampung dan tidak dapat kami tengahi. Kamu tidak diperkenankan:
        </p>
        <ol className={ola}>
          <li>dengan sengaja memindahkan transaksi ke luar DuaCincin untuk menghindari biaya layanan; atau</li>
          <li>menggunakan DuaCincin untuk penipuan, pelecehan, atau tindakan lain yang melanggar hukum.</li>
        </ol>
        <p className="mt-3">
          Pelanggaran berulang dapat berakibat pembatasan atau penutupan akun setelah kamu diberi kesempatan menyampaikan penjelasan.
        </p>
      </>
    ),
  },
  {
    id: "pembatalan",
    title: "Pembatalan dan pengembalian dana",
    body: (
      <ol className={ol}>
        <li>Sebelum uang muka dibayar, booking dapat dibatalkan oleh kamu atau vendor tanpa biaya.</li>
        <li>
          Setelah uang muka dibayar, pembatalan olehmu mengikuti ketentuan pembatalan pada paket yang disepakati dalam booking. Bila paket tidak
          mengaturnya, DuaCincin menengahi berdasarkan biaya nyata yang sudah dikeluarkan vendor dan dapat dibuktikan; sisanya dikembalikan
          kepadamu.
        </li>
        <li>
          Bila vendor membatalkan atau tidak melaksanakan jasa yang disepakati, kamu berhak atas pengembalian seluruh pembayaran yang belum
          diteruskan ke vendor.
        </li>
        <li>
          Bila jasa hanya dilaksanakan sebagian, pembayaran dibagi secara proporsional sesuai keputusan penyelesaian sengketa.
        </li>
        <li>
          Pengembalian dana dikirim ke rekening yang kamu tunjuk dalam 14 (empat belas) hari kerja sejak keputusan pengembalian, tanpa potongan
          dari DuaCincin.
        </li>
      </ol>
    ),
  },
  {
    id: "sengketa",
    title: "Keluhan dan sengketa dengan vendor",
    body: (
      <ol className={ol}>
        <li>
          Bila jasa tidak sesuai kesepakatan, ajukan sengketa melalui halaman booking. DuaCincin menengahi dengan merujuk pada catatan percakapan,
          booking, dan pembayaran, lalu memutuskan penyelesaian pembayaran yang disimpan.
        </li>
        <li>
          Selama sengketa diproses, pembayaran tidak diteruskan ke vendor.
        </li>
        <li>
          Penyelesaian melalui DuaCincin tidak menghapus hakmu sebagai konsumen menurut Undang-Undang Nomor 8 Tahun 1999 tentang Perlindungan
          Konsumen, termasuk mengajukan pengaduan ke Badan Penyelesaian Sengketa Konsumen atau gugatan ke pengadilan.
        </li>
      </ol>
    ),
  },
  {
    id: "data-pribadi",
    title: "Data pribadi",
    body: (
      <ol className={ol}>
        <li>
          DuaCincin memproses data pribadimu sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi dan Peraturan Pemerintah
          Nomor 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik.
        </li>
        <li>
          Data yang kami proses meliputi data akun (nama dan email), data acara (tanggal, anggaran, daftar tamu, rundown), percakapan, booking, dan
          riwayat pembayaran.
        </li>
        <li>
          Data tersebut digunakan untuk menjalankan layanan, mengamankan akun dan transaksi, menengahi sengketa, mengirim pemberitahuan terkait
          akunmu, dan memenuhi kewajiban hukum. Kami tidak menjual data pribadimu.
        </li>
        <li>
          Data hanya dibagikan kepada vendor yang kamu hubungi atau pesan, sebatas yang dibutuhkan untuk booking, dan kepada mitra yang membantu
          kami menjalankan layanan seperti pemrosesan pembayaran dan pengiriman email, yang terikat kewajiban kerahasiaan.
        </li>
        <li>
          Data disimpan selama akunmu aktif dan selama dibutuhkan untuk pembuktian transaksi atau kewajiban hukum, lalu dihapus atau dianonimkan.
        </li>
        <li>
          Kamu berhak meminta akses, perbaikan, atau penghapusan data pribadimu, serta menarik persetujuan, melalui{" "}
          <Link href="/bantuan">pusat bantuan</Link>. Kami menanggapi permintaan dalam waktu yang ditentukan peraturan.
        </li>
        <li>
          Daftar tamu yang kamu masukkan berisi data pribadi orang lain. Kamu bertanggung jawab memastikan data tersebut boleh kamu gunakan untuk
          mengundang mereka.
        </li>
      </ol>
    ),
  },
  {
    id: "konten",
    title: "Konten dan ulasan",
    body: (
      <ol className={ol}>
        <li>
          Ulasan hanya dapat ditulis untuk booking yang telah selesai, harus jujur, dan tidak boleh memuat SARA, ujaran kebencian, atau data pribadi
          orang lain.
        </li>
        <li>
          Dengan menerbitkan ulasan, kamu mengizinkan DuaCincin menampilkannya di profil vendor. DuaCincin dapat menurunkan ulasan yang melanggar
          ketentuan ini.
        </li>
        <li>
          Foto di galeri inspirasi tetap milik pemotretnya dan ditampilkan sebagai referensi. Sumbernya tercantum di halaman{" "}
          <Link href="/kredit">Kredit foto</Link>.
        </li>
      </ol>
    ),
  },
  {
    id: "tanggung-jawab",
    title: "Tanggung jawab",
    body: (
      <ol className={ol}>
        <li>Vendor bertanggung jawab atas mutu dan pelaksanaan jasanya.</li>
        <li>
          DuaCincin bertanggung jawab atas penyelenggaraan layanan dan pengelolaan pembayaranmu sesuai Ketentuan Layanan ini, termasuk atas kerugian
          yang timbul karena kesalahan atau kelalaian DuaCincin.
        </li>
        <li>
          Tidak ada ketentuan dalam dokumen ini yang dimaksudkan untuk mengalihkan tanggung jawab pelaku usaha sebagaimana dilarang Pasal 18
          Undang-Undang Nomor 8 Tahun 1999.
        </li>
      </ol>
    ),
  },
  {
    id: "keadaan-memaksa",
    title: "Keadaan memaksa",
    body: (
      <p>
        Bila acara tidak dapat berlangsung karena keadaan di luar kendali para pihak, seperti bencana alam, wabah, atau larangan pemerintah, DuaCincin
        membantu kamu dan vendor menyepakati penjadwalan ulang. Bila tidak tercapai kesepakatan, pembayaran yang belum diteruskan diselesaikan secara
        adil menurut bagian Pembatalan dan pengembalian dana.
      </p>
    ),
  },
  {
    id: "perubahan",
    title: "Perubahan ketentuan",
    body: (
      <p>
        DuaCincin dapat mengubah Ketentuan Layanan ini. Perubahan penting diberitahukan melalui email atau pemberitahuan di akunmu sekurang-kurangnya
        14 (empat belas) hari sebelum berlaku. Booking yang sudah dikonfirmasi tetap mengikuti ketentuan yang berlaku saat booking dikonfirmasi.
      </p>
    ),
  },
  {
    id: "hukum",
    title: "Hukum yang berlaku",
    body: (
      <ol className={ol}>
        <li>Ketentuan Layanan ini tunduk pada hukum Negara Republik Indonesia dan dibuat dalam Bahasa Indonesia.</li>
        <li>
          Perselisihan antara kamu dan DuaCincin diselesaikan lebih dahulu secara musyawarah. Bila tidak berhasil, kamu dapat menempuh penyelesaian
          melalui Badan Penyelesaian Sengketa Konsumen atau pengadilan negeri sesuai Undang-Undang Nomor 8 Tahun 1999.
        </li>
        <li>
          Pertanyaan dan pengaduan dapat disampaikan melalui <Link href="/bantuan">pusat bantuan</Link>.
        </li>
      </ol>
    ),
  },
];

export default function ClientTosPage() {
  return (
    <LegalPage
      title="Ketentuan Layanan Client"
      current="/legal/client-tos"
      intro="Berlaku untuk calon pengantin yang mencari, berdiskusi, dan memesan vendor lewat DuaCincin. Dengan membuat akun client, kamu menyetujui ketentuan ini."
      sections={SECTIONS}
    />
  );
}
