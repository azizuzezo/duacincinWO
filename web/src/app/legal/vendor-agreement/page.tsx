import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/landing/LegalPage";
import { COMPANY, COMPANY_PAGE } from "@/lib/company";

export const metadata: Metadata = {
  title: "Perjanjian Kemitraan Vendor",
  description: `Perjanjian kemitraan antara ${COMPANY.name} dan vendor pernikahan yang bergabung di DuaCincin.`,
};

// Text in force at LEGAL_VERSION (lib/legal.ts). Any material change needs a
// new version there and in the server's CurrentAgreementVersion.
const ol = "mt-3 list-decimal space-y-2 pl-6 marker:text-dc-clay";
const ola = "mt-2 list-[lower-alpha] space-y-1.5 pl-6";

const SECTIONS: LegalSection[] = [
  {
    id: "para-pihak",
    title: "Para pihak",
    body: (
      <>
        <p>Perjanjian Kemitraan Vendor ini (&quot;Perjanjian&quot;) dibuat antara:</p>
        <ol className={ol}>
          <li>
            <strong>{COMPANY.name}</strong>, perseroan terbatas yang didirikan menurut hukum Indonesia, pemegang NIB {COMPANY.nib} dan tanda
            daftar Penyelenggara Sistem Elektronik lingkup privat nomor {COMPANY.pseNumber}, yang menyelenggarakan DuaCincin
            (&quot;DuaCincin&quot;); dan
          </li>
          <li>
            orang perseorangan atau badan usaha yang mendaftar sebagai vendor di DuaCincin (&quot;Mitra Vendor&quot;).
          </li>
        </ol>
        <p className="mt-3">
          Data lengkap perseroan dapat dilihat di halaman <Link href={COMPANY_PAGE}>Informasi perusahaan</Link>.
        </p>
      </>
    ),
  },
  {
    id: "persetujuan",
    title: "Persetujuan dan berlakunya Perjanjian",
    body: (
      <ol className={ol}>
        <li>
          Dengan mencentang pernyataan persetujuan dan menyelesaikan pendaftaran akun vendor, Mitra Vendor menyatakan telah membaca, memahami, dan menyetujui seluruh isi Perjanjian ini.
          Persetujuan tersebut merupakan kesepakatan yang sah dan mengikat sebagaimana dimaksud Pasal 1320 dan Pasal 1338 Kitab Undang-Undang Hukum
          Perdata.
        </li>
        <li>
          Perjanjian ini merupakan kontrak elektronik yang sah menurut Undang-Undang Nomor 11 Tahun 2008 tentang Informasi dan Transaksi Elektronik
          beserta perubahannya, Peraturan Pemerintah Nomor 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik, dan Peraturan
          Pemerintah Nomor 80 Tahun 2019 tentang Perdagangan Melalui Sistem Elektronik. DuaCincin menyimpan catatan waktu persetujuan dan versi
          Perjanjian yang disetujui sebagai alat bukti.
        </li>
        <li>
          Pihak yang mendaftar atas nama badan usaha menyatakan berwenang mewakili badan usaha tersebut. Pihak perseorangan menyatakan telah dewasa
          dan cakap melakukan perbuatan hukum.
        </li>
        <li>Perjanjian ini berlaku sejak pendaftaran selesai dan tetap berlaku selama akun Mitra Vendor aktif.</li>
      </ol>
    ),
  },
  {
    id: "definisi",
    title: "Definisi",
    body: (
      <ol className={ol}>
        <li>
          <strong>Platform</strong>: situs dan aplikasi DuaCincin beserta seluruh fiturnya, termasuk direktori vendor, percakapan, booking, dan
          pembayaran.
        </li>
        <li>
          <strong>Client</strong>: calon pengantin atau pihak yang mewakilinya yang menggunakan Platform untuk mencari dan memesan jasa pernikahan.
        </li>
        <li>
          <strong>Transaksi Difasilitasi</strong>: setiap pemesanan jasa pernikahan antara Mitra Vendor dan Client yang bermula dari pertemuan,
          percakapan, atau tampilan di Platform, baik disepakati di dalam maupun di luar Platform.
        </li>
        <li>
          <strong>Dana Titipan</strong>: uang muka (DP) dan pelunasan yang dibayar Client melalui Platform dan disimpan di rekening penampung
          DuaCincin sampai diteruskan kepada Mitra Vendor atau dikembalikan kepada Client sesuai Perjanjian ini.
        </li>
        <li>
          <strong>Komisi</strong>: imbalan jasa yang menjadi hak DuaCincin atas setiap Transaksi Difasilitasi yang selesai.
        </li>
      </ol>
    ),
  },
  {
    id: "pendaftaran",
    title: "Pendaftaran dan verifikasi",
    body: (
      <ol className={ol}>
        <li>
          Mitra Vendor wajib memberikan data yang benar, lengkap, dan terbaru, termasuk nama usaha, kategori jasa, kota layanan, portofolio, dan
          rekening bank atas nama yang sama dengan pemilik usaha.
        </li>
        <li>
          DuaCincin berhak memeriksa data tersebut serta menyetujui atau menolak pendaftaran. Profil Mitra Vendor baru tampil di direktori setelah
          disetujui.
        </li>
        <li>
          Mitra Vendor bertanggung jawab menjaga kerahasiaan akun dan kata sandinya, serta atas seluruh kegiatan yang dilakukan melalui akunnya.
        </li>
        <li>Perubahan nama usaha diajukan melalui Platform dan berlaku setelah disetujui DuaCincin.</li>
      </ol>
    ),
  },
  {
    id: "kewajiban",
    title: "Kewajiban Mitra Vendor",
    body: (
      <ol className={ol}>
        <li>
          Memproses seluruh percakapan, penawaran, kesepakatan harga, booking, dan pembayaran Transaksi Difasilitasi melalui Platform.
        </li>
        <li>
          Menyajikan informasi jasa, paket, dan harga secara benar dan jelas, serta tidak menyesatkan, sesuai Undang-Undang Nomor 8 Tahun 1999
          tentang Perlindungan Konsumen.
        </li>
        <li>
          Melaksanakan jasa sesuai paket, tanggal, dan kesepakatan yang tercatat di booking, dengan mutu yang layak dan tepat waktu.
        </li>
        <li>Menanggapi permintaan booking dan pesan Client dalam waktu yang wajar.</li>
        <li>
          Memiliki dan mematuhi seluruh izin usaha serta kewajiban perpajakan yang berlaku bagi usahanya. Pajak atas penghasilan Mitra Vendor
          menjadi tanggung jawab Mitra Vendor.
        </li>
        <li>
          Hanya mengunggah foto, video, dan materi lain yang merupakan hasil karyanya sendiri atau yang sah digunakannya, serta memberi DuaCincin
          izin non-eksklusif dan tanpa royalti untuk menampilkan materi tersebut di Platform dan materi promosi DuaCincin selama Perjanjian berlaku.
        </li>
      </ol>
    ),
  },
  {
    id: "larangan",
    title: "Larangan transaksi di luar Platform",
    body: (
      <>
        <p>Untuk Transaksi Difasilitasi, Mitra Vendor dilarang:</p>
        <ol className={ola}>
          <li>
            meminta atau mengarahkan Client berkomunikasi atau bertransaksi di luar Platform, antara lain melalui nomor telepon, aplikasi pesan, media
            sosial, atau transfer ke rekening pribadi;
          </li>
          <li>memberi potongan harga atau insentif lain agar Client membayar di luar Platform;</li>
          <li>menyembunyikan, memecah, atau memanipulasi nilai transaksi untuk menghindari Komisi; dan</li>
          <li>menggunakan data Client yang diperoleh dari Platform untuk menawarkan jasa di luar Platform.</li>
        </ol>
        <p className="mt-3">
          Larangan ini tetap berlaku sampai 12 (dua belas) bulan sejak percakapan pertama dengan Client yang bersangkutan, termasuk bila akun Mitra
          Vendor telah berakhir.
        </p>
      </>
    ),
  },
  {
    id: "pembayaran",
    title: "Pembayaran, Dana Titipan, dan pencairan",
    body: (
      <ol className={ol}>
        <li>
          Client membayar uang muka sebesar 30% (tiga puluh persen) dari harga yang disepakati setelah Mitra Vendor mengonfirmasi booking, dan
          melunasi sisanya sebelum technical meeting. Seluruh pembayaran dilakukan melalui Platform.
        </li>
        <li>
          Pembayaran Client disimpan sebagai Dana Titipan dan belum menjadi hak Mitra Vendor sampai acara selesai dan dikonfirmasi oleh Client.
        </li>
        <li>
          Setelah Client mengonfirmasi acara selesai, DuaCincin meneruskan Dana Titipan ke rekening Mitra Vendor yang terdaftar, dikurangi Komisi,
          dan mencatat rinciannya di halaman Pencairan.
        </li>
        <li>
          Bila Client mengajukan keberatan sebelum mengonfirmasi, pencairan ditunda sampai keberatan diselesaikan menurut bagian Penyelesaian
          sengketa.
        </li>
      </ol>
    ),
  },
  {
    id: "komisi",
    title: "Komisi",
    body: (
      <ol className={ol}>
        <li>
          DuaCincin berhak atas Komisi sebesar 10% (sepuluh persen) dari nilai setiap Transaksi Difasilitasi yang selesai, kecuali tarif lain
          disepakati secara tertulis dan tercantum di akun Mitra Vendor.
        </li>
        <li>Komisi dipotong langsung dari Dana Titipan pada saat pencairan.</li>
        <li>
          Perubahan tarif Komisi diberitahukan sekurang-kurangnya 30 (tiga puluh) hari sebelum berlaku dan tidak berlaku bagi booking yang sudah
          dikonfirmasi sebelum tanggal perubahan.
        </li>
      </ol>
    ),
  },
  {
    id: "pembatalan",
    title: "Pembatalan dan pengembalian dana",
    body: (
      <ol className={ol}>
        <li>Sebelum uang muka dibayar, booking dapat dibatalkan oleh Client atau Mitra Vendor tanpa biaya.</li>
        <li>
          Setelah uang muka dibayar, pembatalan diselesaikan sesuai ketentuan pembatalan pada paket yang disepakati dalam booking. Bila paket tidak
          mengatur pembatalan, DuaCincin menengahi berdasarkan biaya nyata yang sudah dikeluarkan Mitra Vendor dan dapat dibuktikan.
        </li>
        <li>
          Bila Mitra Vendor membatalkan atau tidak melaksanakan jasa yang telah disepakati, Client berhak atas pengembalian seluruh Dana Titipan
          yang belum diteruskan, tanpa mengurangi hak Client menuntut ganti rugi menurut hukum.
        </li>
        <li>
          Bila jasa hanya dilaksanakan sebagian, Dana Titipan dibagi secara proporsional berdasarkan bagian jasa yang terlaksana, sesuai keputusan
          penyelesaian sengketa.
        </li>
      </ol>
    ),
  },
  {
    id: "data-pribadi",
    title: "Kerahasiaan dan pelindungan data pribadi",
    body: (
      <ol className={ol}>
        <li>
          Mitra Vendor menerima data pribadi Client hanya untuk melaksanakan Transaksi Difasilitasi dan wajib memprosesnya sesuai Undang-Undang
          Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
        </li>
        <li>
          Mitra Vendor dilarang menjual, membagikan, atau menggunakan data pribadi Client untuk tujuan lain, dan wajib menghapusnya bila tidak lagi
          dibutuhkan untuk transaksi tersebut atau untuk kewajiban hukum.
        </li>
        <li>
          Mitra Vendor wajib segera memberi tahu DuaCincin bila mengetahui adanya kebocoran atau penyalahgunaan data pribadi Client.
        </li>
        <li>
          DuaCincin memproses data pribadi Mitra Vendor untuk menjalankan kemitraan ini, termasuk verifikasi, pembayaran, dan pemenuhan kewajiban
          hukum.
        </li>
      </ol>
    ),
  },
  {
    id: "sanksi",
    title: "Pelanggaran dan sanksi",
    body: (
      <>
        <p>
          Pelanggaran atas Perjanjian ini, khususnya bagian Larangan transaksi di luar Platform, dikenakan sanksi bertingkat sesuai berat dan
          pengulangannya:
        </p>
        <ol className={ola}>
          <li>peringatan tertulis;</li>
          <li>
            kewajiban membayar ganti rugi sebesar Komisi yang seharusnya diterima DuaCincin atas transaksi yang dialihkan ke luar Platform;
          </li>
          <li>penangguhan akun selama 30 (tiga puluh) hari, sehingga profil tidak tampil di direktori; dan</li>
          <li>pemutusan kemitraan secara permanen.</li>
        </ol>
        <p className="mt-3">
          Untuk pelanggaran berat, seperti penipuan atau penyalahgunaan data pribadi Client, DuaCincin dapat langsung menjatuhkan sanksi yang lebih
          tinggi. Sanksi ini tidak mengurangi hak DuaCincin dan Client untuk menuntut ganti rugi melalui jalur hukum. Sebelum sanksi dijatuhkan,
          Mitra Vendor diberi kesempatan menyampaikan penjelasan.
        </p>
      </>
    ),
  },
  {
    id: "tanggung-jawab",
    title: "Tanggung jawab",
    body: (
      <ol className={ol}>
        <li>
          Mitra Vendor bertanggung jawab penuh atas mutu dan pelaksanaan jasanya, termasuk kerugian Client yang timbul karena kesalahan atau
          kelalaian Mitra Vendor.
        </li>
        <li>
          DuaCincin bertanggung jawab atas penyelenggaraan Platform dan pengelolaan Dana Titipan sesuai Perjanjian ini, tetapi bukan pihak pelaksana
          jasa pernikahan.
        </li>
        <li>
          Mitra Vendor membebaskan DuaCincin dari tuntutan pihak ketiga yang timbul karena pelanggaran Mitra Vendor atas Perjanjian ini atau atas
          hak pihak ketiga, termasuk hak cipta atas materi yang diunggah.
        </li>
      </ol>
    ),
  },
  {
    id: "keadaan-memaksa",
    title: "Keadaan memaksa",
    body: (
      <p>
        Para pihak tidak dianggap lalai bila tidak dapat memenuhi kewajiban karena keadaan di luar kendalinya, seperti bencana alam, wabah, kerusuhan,
        atau kebijakan pemerintah yang melarang penyelenggaraan acara. Pihak yang terdampak wajib memberi tahu pihak lain secepatnya, dan para pihak
        bersama Client mengupayakan penjadwalan ulang atau penyelesaian Dana Titipan secara adil.
      </p>
    ),
  },
  {
    id: "pengakhiran",
    title: "Masa berlaku dan pengakhiran",
    body: (
      <ol className={ol}>
        <li>
          Mitra Vendor dapat mengakhiri Perjanjian dengan pemberitahuan tertulis 30 (tiga puluh) hari sebelumnya. DuaCincin dapat mengakhiri
          Perjanjian dengan pemberitahuan yang sama, atau seketika bila terjadi pelanggaran berat.
        </li>
        <li>
          Booking yang sudah dikonfirmasi sebelum pengakhiran tetap wajib diselesaikan atau dibatalkan sesuai bagian Pembatalan dan pengembalian
          dana.
        </li>
        <li>
          Para pihak sepakat mengesampingkan Pasal 1266 Kitab Undang-Undang Hukum Perdata sepanjang mengenai keharusan putusan pengadilan untuk
          mengakhiri Perjanjian.
        </li>
        <li>
          Bagian Larangan transaksi di luar Platform, Kerahasiaan dan pelindungan data pribadi, dan Tanggung jawab tetap berlaku setelah Perjanjian
          berakhir.
        </li>
      </ol>
    ),
  },
  {
    id: "perubahan",
    title: "Perubahan Perjanjian",
    body: (
      <p>
        DuaCincin dapat mengubah Perjanjian ini. Perubahan diberitahukan melalui Platform atau email sekurang-kurangnya 14 (empat belas) hari sebelum
        berlaku, dengan versi dan tanggal berlaku yang baru. Bila Mitra Vendor tidak setuju, Mitra Vendor dapat mengakhiri Perjanjian sebelum
        perubahan berlaku. Penggunaan Platform setelah tanggal berlaku berarti Mitra Vendor menyetujui perubahan tersebut.
      </p>
    ),
  },
  {
    id: "sengketa",
    title: "Penyelesaian sengketa",
    body: (
      <ol className={ol}>
        <li>
          Perselisihan antara Mitra Vendor dan Client atas suatu booking diajukan melalui fitur sengketa di Platform. DuaCincin menengahi dengan
          merujuk pada catatan percakapan, booking, dan pembayaran, lalu memutuskan penyelesaian Dana Titipan.
        </li>
        <li>
          Perselisihan antara Mitra Vendor dan DuaCincin diselesaikan lebih dahulu secara musyawarah dalam waktu 30 (tiga puluh) hari sejak
          pemberitahuan tertulis.
        </li>
        <li>
          Bila musyawarah tidak berhasil, perselisihan diselesaikan melalui Pengadilan Negeri yang wilayah hukumnya meliputi domisili {COMPANY.name}.
        </li>
      </ol>
    ),
  },
  {
    id: "hukum",
    title: "Hukum yang berlaku dan lain-lain",
    body: (
      <ol className={ol}>
        <li>Perjanjian ini tunduk pada dan ditafsirkan menurut hukum Negara Republik Indonesia.</li>
        <li>
          Perjanjian ini dibuat dalam Bahasa Indonesia sesuai Undang-Undang Nomor 24 Tahun 2009. Bila ada terjemahan, versi Bahasa Indonesia yang
          berlaku.
        </li>
        <li>
          Bila salah satu ketentuan dinyatakan tidak sah, ketentuan lainnya tetap berlaku. Mitra Vendor tidak dapat mengalihkan hak dan kewajibannya
          tanpa persetujuan tertulis DuaCincin.
        </li>
        <li>
          Pemberitahuan kepada Mitra Vendor dikirim ke email akun atau melalui notifikasi di Platform. Pemberitahuan kepada DuaCincin disampaikan
          melalui <Link href="/bantuan">pusat bantuan</Link>.
        </li>
      </ol>
    ),
  },
];

export default function VendorAgreementPage() {
  return (
    <LegalPage
      title="Perjanjian Kemitraan Vendor DuaCincin"
      current="/legal/vendor-agreement"
      intro="Berlaku untuk setiap vendor yang mendaftar di DuaCincin. Saat mendaftar, kamu mencentang persetujuan atas perjanjian ini."
      sections={SECTIONS}
    />
  );
}
