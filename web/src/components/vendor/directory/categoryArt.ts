// Picture and plain copy per vendor category, shared by the /vendors directory
// and the server-rendered /kategori pages. Pictures are real Indonesian wedding
// photos from Wikimedia Commons (public/photos/kategori, credited on /kredit),
// the same ones the home page category mosaic uses.
// Copy describes what a couple compares and asks in that category: general
// advice, no counts, no promises beyond what the product does (chat with the
// vendor, see packages, pay through escrow).

export type CategoryArt = {
  src: string;
  alt: string;
  /** Cutout image: shown contained on a warm studio ground. */
  studio?: boolean;
  /** Short line under the name: what the category covers. */
  covers: string;
  /** One paragraph for the category page hero. */
  intro: string;
  /** Questions worth asking this kind of vendor before booking. */
  ask: string[];
};

export const CATEGORY_ART: Record<string, CategoryArt> = {
  venue: {
    src: "/photos/kategori/venue-1400.webp",
    alt: "Gedung resepsi pernikahan di Jakarta dengan lampu gantung dan lorong bunga menuju pelaminan",
    covers: "Gedung, ballroom, taman, rumah adat",
    intro:
      "Tempat menentukan banyak hal lain: jumlah tamu, gaya dekorasi, sampai jam acara. Lihat foto ruangannya, bandingkan harga mulai dari, lalu tanyakan langsung ke pengelola lewat chat.",
    ask: ["Berapa kapasitas duduk dan berdiri?", "Jam berapa boleh mulai loading dekorasi?", "Apakah wajib memakai katering rekanan?"],
  },
  catering: {
    src: "/photos/kategori/katering-1400.webp",
    alt: "Tumpeng nasi kuning dengan lauk pauk lengkap di atas daun pisang",
    covers: "Prasmanan, gubukan, menu adat",
    intro:
      "Hidangan adalah hal yang paling diingat tamu. Bandingkan jenis paket, menu, dan harga mulai dari, lalu minta detail porsi per tamu lewat chat sebelum memilih.",
    ask: ["Berapa porsi cadangan di luar jumlah tamu?", "Apakah ada sesi cicip menu?", "Sudah termasuk alat saji dan petugas?"],
  },
  decor: {
    src: "/photos/kategori/dekorasi-1400.webp",
    alt: "Pelaminan adat Minangkabau berukir emas dengan kursi pengantin merah",
    covers: "Pelaminan, gapura, bunga, lampu",
    intro:
      "Dekorasi mengubah ruangan menjadi suasana yang kamu bayangkan. Lihat portofolio sesuai adat atau gaya acaramu, lalu tanyakan apa saja yang termasuk dalam paket.",
    ask: ["Bunga segar atau artifisial?", "Sudah termasuk pelaminan, gapura, dan lampu?", "Berapa lama waktu pemasangan di venue?"],
  },
  mua_attire: {
    src: "/photos/kategori/rias-1400.webp",
    alt: "Riasan pengantin putri Jember Pendalungan dengan mahkota emas dan untaian melati",
    covers: "Rias, busana adat, gaun, beskap",
    intro:
      "Rias dan busana tampil di setiap foto hari-H. Perhatikan hasil rias di portofolio, terutama untuk adat yang kamu pakai, dan tanyakan jadwal fitting sejak awal.",
    ask: ["Berapa kali fitting busana?", "Apakah termasuk rias keluarga inti?", "Ada tes rias sebelum hari-H?"],
  },
  photo_video: {
    src: "/photos/kategori/foto-1400.webp",
    alt: "Potret pengantin Bali bermahkota emas saat upacara pernikahan",
    covers: "Foto, video, prewedding",
    intro:
      "Foto dan video adalah yang tersisa setelah acara selesai. Pilih gaya yang kamu suka dari portofolio, lalu pastikan jumlah fotografer dan bentuk hasil akhirnya.",
    ask: ["Berapa fotografer dan videografer yang datang?", "Kapan hasil foto dan video diterima?", "Sudah termasuk album cetak?"],
  },
  entertainment: {
    src: "/photos/kategori/hiburan-1400.webp",
    alt: "Pemain gamelan Jawa tampil di Yogyakarta",
    covers: "Musik, MC, hiburan adat",
    intro:
      "Musik dan pembawa acara menjaga suasana tetap hidup. Dengarkan contoh penampilan bila vendor menyediakannya, dan bicarakan susunan lagu sesuai rundown acaramu.",
    ask: ["Berapa lama durasi tampil?", "Bisa membawakan lagu permintaan?", "Perlu daya listrik berapa di venue?"],
  },
  invitation_souvenir: {
    src: "/photos/kategori/suvenir-1400.webp",
    alt: "Undangan pernikahan cetak berhias bunga mawar, dengan amplopnya",
    covers: "Undangan cetak, papan nama, suvenir",
    intro:
      "Undangan adalah kesan pertama tamu, suvenir kesan terakhirnya. Bandingkan bahan dan harga mulai dari, lalu tanyakan waktu produksi agar sempat dibagikan.",
    ask: ["Berapa lama waktu produksi?", "Berapa jumlah pesanan minimal?", "Bisa minta contoh cetak dulu?"],
  },
};

export const FALLBACK_ART: CategoryArt = {
  src: "/photos/momen/resepsi-mandar-1400.webp",
  alt: "Keluarga pengantin berbusana adat Bugis di pelaminan berhias bunga",
  covers: "Vendor pernikahan",
  intro: "Bandingkan portofolio dan harga mulai dari, lalu bicarakan kebutuhanmu langsung dengan vendor lewat chat.",
  ask: [],
};

export function artFor(category: string): CategoryArt {
  return CATEGORY_ART[category] ?? FALLBACK_ART;
}
