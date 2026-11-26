// A buying guide for the categories that are worth a search result even
// before a vendor lists in them (see GUIDED_CATEGORIES in lib/seo.ts). Plain
// advice that holds anywhere in Indonesia: no prices, counts or promises.

export type Guide = { heading: string; blocks: { title: string; body: string }[] };

export const CATEGORY_GUIDES: Record<string, Guide> = {
  decor: {
    heading: "Panduan memilih dekorasi pernikahan",
    blocks: [
      {
        title: "Mulai dari konsep, bukan dari harga",
        body: "Tentukan suasana yang kalian mau: adat, garden party, atau modern minimalis. Kumpulkan lima sampai sepuluh foto referensi (galeri Inspirasi bisa dipakai) lalu tunjukkan ke vendor. Dengan gambaran yang jelas, vendor bisa menyusun penawaran yang sesuai, bukan paket generik.",
      },
      {
        title: "Yang membuat harga dekorasi berbeda",
        body: "Luas dan tinggi pelaminan, bunga segar atau artifisial, jumlah titik dekor (gerbang, meja akad, photobooth, lorong tamu), pencahayaan, dan jarak ke lokasi acara. Minta rincian tertulis supaya jelas mana yang sudah termasuk.",
      },
      {
        title: "Pastikan dulu soal lokasi acara",
        body: "Tanyakan jam akses untuk pasang dan bongkar, ketersediaan listrik, aturan venue untuk vendor dekorasi dari luar, dan jalur bongkar muat. Dekorasi besar yang tidak sempat dipasang adalah masalah yang sering terlambat disadari.",
      },
      {
        title: "Cek sebelum membayar DP",
        body: "Lihat contoh hasil kerja nyata di profil vendor, tanyakan kebijakan bunga pengganti bila stok kurang, dan pastikan siapa yang bertanggung jawab di hari H. Simpan kesepakatan di chat DuaCincin supaya ada catatan yang bisa dirujuk.",
      },
    ],
  },
  venue: {
    heading: "Panduan memilih venue pernikahan",
    blocks: [
      {
        title: "Mulai dari jumlah tamu",
        body: "Bedakan kapasitas duduk dan kapasitas berdiri, lalu sisakan ruang untuk pelaminan, prasmanan, dan jalur tamu. Venue yang pas di angka bisa terasa sesak saat acara berjalan, jadi tanyakan kapasitas yang nyaman, bukan hanya yang maksimal.",
      },
      {
        title: "Indoor, outdoor, atau semi outdoor",
        body: "Outdoor butuh rencana cadangan bila hujan. Indoor perlu dicek pendinginnya dan kekuatan listriknya. Tanyakan juga genset, area parkir, dan akses untuk tamu lansia atau yang memakai kursi roda.",
      },
      {
        title: "Katering dan vendor dari luar",
        body: "Sebagian venue mewajibkan katering mereka, sebagian membolehkan katering luar dengan syarat atau biaya tambahan. Hal yang sama berlaku untuk dekorasi dan dokumentasi. Tanyakan sejak awal supaya tidak mengubah anggaran di tengah jalan.",
      },
      {
        title: "Biaya yang sering terlewat",
        body: "Sewa per jam atau per paket, biaya lembur, listrik tambahan, keamanan, kebersihan, dan pajak atau biaya layanan. Minta rincian tertulis dan jadwal pembayaran, lalu bandingkan dua atau tiga venue dengan komponen yang sama.",
      },
    ],
  },
};
