// Picture and plain copy per vendor category, shared by the /vendors directory
// and the server-rendered /kategori pages. Pictures come from the DuaCincin
// Pinterest board (public/photos/pinterest, credited on /kredit), the same
// ones the home page category mosaic uses.
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
    src: "/photos/pinterest/venue-joglo.webp",
    alt: "Joglo di perbukitan dekat Borobudur dengan lorong putih dan deretan kursi tamu untuk akad di taman",
    covers: "Gedung, ballroom, taman, rumah adat",
    intro:
      "Tempat menentukan banyak hal lain: jumlah tamu, gaya dekorasi, sampai jam acara. Lihat foto ruangannya, bandingkan harga mulai dari, lalu tanyakan langsung ke pengelola lewat chat.",
    ask: ["Berapa kapasitas duduk dan berdiri?", "Jam berapa boleh mulai loading dekorasi?", "Apakah wajib memakai katering rekanan?"],
  },
  catering: {
    src: "/photos/pinterest/katering-jajanan.webp",
    alt: "Meja jajanan tradisional di atas daun pisang dan nampan rotan",
    covers: "Prasmanan, gubukan, menu adat",
    intro:
      "Hidangan adalah hal yang paling diingat tamu. Bandingkan jenis paket, menu, dan harga mulai dari, lalu minta detail porsi per tamu lewat chat sebelum memilih.",
    ask: ["Berapa porsi cadangan di luar jumlah tamu?", "Apakah ada sesi cicip menu?", "Sudah termasuk alat saji dan petugas?"],
  },
  decor: {
    src: "/photos/pinterest/dekorasi-taman.webp",
    alt: "Panggung taman putih dengan bunga pastel, lorong putih, lilin tinggi dan lampu gantung",
    covers: "Pelaminan, gapura, bunga, lampu",
    intro:
      "Dekorasi mengubah ruangan menjadi suasana yang kamu bayangkan. Lihat portofolio sesuai adat atau gaya acaramu, lalu tanyakan apa saja yang termasuk dalam paket.",
    ask: ["Bunga segar atau artifisial?", "Sudah termasuk pelaminan, gapura, dan lampu?", "Berapa lama waktu pemasangan di venue?"],
  },
  mua_attire: {
    src: "/photos/pinterest/rias-hijab.webp",
    alt: "Pengantin berhijab cokelat dengan mahkota bunga emas dan kebaya payet",
    covers: "Rias, busana adat, gaun, beskap",
    intro:
      "Rias dan busana tampil di setiap foto hari-H. Perhatikan hasil rias di portofolio, terutama untuk adat yang kamu pakai, dan tanyakan jadwal fitting sejak awal.",
    ask: ["Berapa kali fitting busana?", "Apakah termasuk rias keluarga inti?", "Ada tes rias sebelum hari-H?"],
  },
  photo_video: {
    src: "/photos/pinterest/foto-gapura.webp",
    alt: "Pasangan pengantin berpelukan di bawah gapura bunga matahari di taman perbukitan",
    covers: "Foto, video, prewedding",
    intro:
      "Foto dan video adalah yang tersisa setelah acara selesai. Pilih gaya yang kamu suka dari portofolio, lalu pastikan jumlah fotografer dan bentuk hasil akhirnya.",
    ask: ["Berapa fotografer dan videografer yang datang?", "Kapan hasil foto dan video diterima?", "Sudah termasuk album cetak?"],
  },
  entertainment: {
    src: "/photos/pinterest/kirab-malam.webp",
    alt: "Kirab pengantin malam hari di antara tamu yang mengabadikan momen",
    covers: "Musik, band, hiburan adat",
    intro:
      "Musik menjaga suasana tetap hidup. Dengarkan contoh penampilan bila vendor menyediakannya, dan bicarakan susunan lagu sesuai rundown acaramu.",
    ask: ["Berapa lama durasi tampil?", "Bisa membawakan lagu permintaan?", "Perlu daya listrik berapa di venue?"],
  },
  invitation_souvenir: {
    src: "/photos/pinterest/suvenir-anggrek.webp",
    alt: "Kotak suvenir satin emas berhias anggrek putih dan daun emas",
    covers: "Undangan cetak, papan nama, suvenir",
    intro:
      "Undangan adalah kesan pertama tamu, suvenir kesan terakhirnya. Bandingkan bahan dan harga mulai dari, lalu tanyakan waktu produksi agar sempat dibagikan.",
    ask: ["Berapa lama waktu produksi?", "Berapa jumlah pesanan minimal?", "Bisa minta contoh cetak dulu?"],
  },
  hantaran: {
    src: "/photos/pinterest/penutup-lilin.webp",
    alt: "Meja resepsi dengan lilin dan bunga",
    covers: "Seserahan, hantaran, mahar hias",
    intro:
      "Hantaran dan seserahan dibawa ke keluarga pasangan, jadi tampilannya ikut dilihat banyak orang. Lihat contoh susunan di portofolio, lalu bicarakan isi dan jumlah wadahnya.",
    ask: ["Isi seserahan dari kami atau disiapkan vendor?", "Berapa jumlah wadah dalam satu paket?", "Wadah dikembalikan atau boleh disimpan?"],
  },
  mc: {
    src: "/photos/pinterest/pendopo-kursi-tamu.webp",
    alt: "Pendopo beratap joglo dengan deretan kursi tamu di taman",
    covers: "MC akad, resepsi, acara adat",
    intro:
      "MC menjaga acara berjalan sesuai rundown dan membuat tamu merasa disambut. Tanyakan pengalamannya dengan adat yang kamu pakai dan bahasa yang dipakai di panggung.",
    ask: ["Bisa memandu prosesi adat kami?", "Bahasa apa saja yang dipakai?", "Ada pertemuan teknis sebelum hari-H?"],
  },
  content_creator: {
    src: "/photos/pinterest/pasangan-sofa-bunga.webp",
    alt: "Pasangan pengantin berbusana putih tersenyum di sofa, di depan dinding bunga merah",
    covers: "Konten Reels, TikTok, behind the scene",
    intro:
      "Wedding content creator merekam momen dari dekat dengan ponsel dan mengunggahnya cepat, berbeda dari dokumentasi foto dan video. Lihat contoh kontennya, lalu pastikan kapan hasilnya diterima.",
    ask: ["Berapa video yang diterima dan kapan?", "Diunggah ke akun kami atau akun vendor?", "Mulai dari sesi rias atau dari akad?"],
  },
  wedding_car: {
    src: "/photos/pinterest/kirab-malam.webp",
    alt: "Kirab pengantin malam hari di antara tamu yang mengabadikan momen",
    covers: "Mobil pengantin, sopir, hiasan bunga",
    intro:
      "Mobil pengantin mengantar kalian di hari-H dan sering ikut tampil di foto. Pilih jenis mobilnya, lalu pastikan durasi sewa, sopir, dan hiasannya.",
    ask: ["Sudah termasuk sopir dan bensin?", "Berapa jam durasi sewanya?", "Hiasan bunga termasuk paket?"],
  },
  wedding_cake: {
    src: "/photos/pinterest/resepsi-taman.webp",
    alt: "Resepsi di taman dengan meja tamu, bunga putih dan lampu gantung",
    covers: "Kue pengantin, dessert table",
    intro:
      "Kue pengantin jadi pusat perhatian saat sesi potong kue. Lihat desain di portofolio, lalu tanyakan rasa, jumlah tingkat, dan cara kuenya dibawa ke venue.",
    ask: ["Ada sesi cicip rasa?", "Tingkat atas kue asli atau dummy?", "Sudah termasuk pengantaran ke venue?"],
  },
};

export const FALLBACK_ART: CategoryArt = {
  src: "/photos/pinterest/resepsi-taman.webp",
  alt: "Resepsi di taman dengan meja tamu, bunga putih dan lampu gantung",
  covers: "Vendor pernikahan",
  intro: "Bandingkan portofolio dan harga mulai dari, lalu bicarakan kebutuhanmu langsung dengan vendor lewat chat.",
  ask: [],
};

export function artFor(category: string): CategoryArt {
  return CATEGORY_ART[category] ?? FALLBACK_ART;
}
