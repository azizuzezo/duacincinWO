// Every article on /artikel. The body is src/content/artikel/<slug>.mdx; the
// metadata lives here so the index, the article page, the sitemap and the
// JSON-LD read one list. To publish an article: add the .mdx file and an entry
// here (newest first). Photos come from public/photos and must be credited on
// /kredit (src/components/kredit/credits.ts).

export type Article = {
  slug: string;
  title: string;
  /** Meta description and card text, about 150 characters. */
  description: string;
  /** Short label above the title. */
  topic: string;
  /** ISO dates (YYYY-MM-DD). */
  published: string;
  updated?: string;
  image: string;
  imageAlt: string;
  readMinutes: number;
  /** Vendor categories (VENDOR_CATEGORIES values) the article sends readers to. */
  categories: string[];
};

export const ARTICLES: Article[] = [
  {
    slug: "biaya-nikah-di-kua",
    title: "Biaya nikah di KUA: Rp0 atau Rp600 ribu, cara bayar, pungli",
    description:
      "Tarif Rp0 untuk akad di KUA pada jam kerja, Rp600.000 di luar KUA atau di luar jam kerja (PP 59/2018). Cara bayar lewat kode billing dan pungutan tidak sah.",
    topic: "Legal",
    published: "2026-11-21",
    image: "/photos/pinterest/akad-joglo-lorong.webp",
    imageAlt: "Akad nikah di lorong rumah joglo",
    readMinutes: 7,
    categories: ["venue"],
  },
  {
    slug: "syarat-nikah-di-kua",
    title: "Syarat nikah di KUA: dokumen, alur, dan batas waktu daftar",
    description:
      "Daftar dokumen nikah di KUA menurut PMA 30/2024, syarat usia 19 tahun, izin orang tua, janda/duda, TNI/Polri, WNA, alur SIMKAH, dan batas 10 hari kerja.",
    topic: "Legal",
    published: "2026-11-21",
    image: "/photos/pinterest/pasangan-internasional.webp",
    imageAlt: "Pasangan pengantin bergandengan tangan",
    readMinutes: 7,
    categories: ["mua_attire",  "invitation_souvenir"],
  },
  {
    slug: "biaya-pernikahan-jakarta",
    title: "Biaya pernikahan di Jakarta: kisaran per pos dan contohnya",
    description:
      "Kisaran biaya nikah di Jakarta per pos (gedung, katering per pax, dekorasi, MUA, foto-video, WO) dengan sumber, plus contoh hitungan 300 tamu.",
    topic: "Anggaran",
    published: "2026-11-21",
    image: "/photos/pinterest/pendopo-kursi-tamu.webp",
    imageAlt: "Kursi tamu tertata rapi di pendopo pernikahan",
    readMinutes: 7,
    categories: ["venue",  "catering",  "decor",  "mua_attire",  "photo_video"],
  },
  {
    slug: "biaya-pernikahan-sederhana-50-juta",
    title: "Biaya pernikahan sederhana 50 juta: rincian dan jumlah tamu",
    description:
      "Rincian biaya nikah 50 juta: berapa tamu yang muat, pilihan di rumah, gedung kecil, atau resepsi siang, pos yang boleh dipangkas, dan checklist anggaran.",
    topic: "Anggaran",
    published: "2026-11-21",
    image: "/photos/pinterest/resepsi-taman.webp",
    imageAlt: "Resepsi pernikahan sederhana di taman",
    readMinutes: 6,
    categories: ["catering",  "venue",  "decor",  "mua_attire",  "photo_video"],
  },
  {
    slug: "harga-catering-pernikahan-per-pax",
    title: "Harga catering pernikahan per pax di Jabodetabek",
    description:
      "Harga katering pernikahan per pax untuk prasmanan, gubukan, nasi kotak, dan plated di Jabodetabek, cara hitung porsi per undangan, plus contoh 300 dan 500 tamu.",
    topic: "Katering",
    published: "2026-11-21",
    image: "/photos/kategori-vendor/catering-meja.webp",
    imageAlt: "Meja hidangan pernikahan dengan kue kecil di nampan emas dan anggrek putih",
    readMinutes: 7,
    categories: ["catering",  "venue"],
  },
  {
    slug: "harga-mua-pengantin",
    title: "Harga MUA pengantin: akad, resepsi, adat, dan hijab",
    description:
      "Harga MUA pengantin untuk akad, akad dan resepsi, dan paket busana, plus biaya tambahan paes adat Jawa, hijab, retouch, keluarga, dan cara memesan aman.",
    topic: "Rias",
    published: "2026-11-21",
    image: "/photos/pinterest/rias-hijab.webp",
    imageAlt: "Pengantin berhijab dengan riasan pernikahan",
    readMinutes: 7,
    categories: ["mua_attire"],
  },
  {
    slug: "susunan-acara-pernikahan-adat-jawa",
    title: "Susunan acara pernikahan adat Jawa: urutan dan maknanya",
    description:
      "Urutan acara pernikahan adat Jawa dari srah-srahan, siraman, midodareni, ijab kabul, sampai panggih dan sungkeman, plus contoh rundown dan vendor yang perlu.",
    topic: "Adat",
    published: "2026-11-21",
    image: "/photos/pinterest/foto-gapura.webp",
    imageAlt: "Pasangan pengantin berfoto di gapura bunga",
    readMinutes: 7,
    categories: ["mua_attire",  "decor",  "entertainment",  "mc",  "hantaran"],
  },
  {
    slug: "adat-pernikahan-sunda",
    title: "Adat pernikahan Sunda: urutan prosesi dan maknanya",
    description:
      "Urutan adat pernikahan Sunda dari neundeun omong, ngeuyeuk seureuh, sawer, nincak endog, sampai huap lingkung, beserta makna, siger, dan vendor yang dibutuhkan.",
    topic: "Adat",
    published: "2026-11-21",
    image: "/photos/pinterest/konsultan-rias.webp",
    imageAlt: "Perias menyiapkan riasan pengantin",
    readMinutes: 7,
    categories: ["mua_attire",  "decor",  "entertainment",  "mc",  "hantaran"],
  },
  {
    slug: "adat-pernikahan-minang",
    title: "Adat pernikahan Minang: urutan prosesi, makna, dan suntiang",
    description:
      "Urutan adat pernikahan Minang dari maresek, batimbang tando, malam bainai, manjapuik marapulai sampai manjalang mintuo, beserta makna dan vendor.",
    topic: "Adat",
    published: "2026-11-21",
    image: "/photos/pinterest/pelaminan-kristal.webp",
    imageAlt: "Pelaminan pernikahan yang megah",
    readMinutes: 7,
    categories: ["mua_attire",  "decor",  "catering",  "hantaran"],
  },
  {
    slug: "daftar-seserahan-pernikahan",
    title: "Daftar seserahan pernikahan lengkap, makna, dan harganya",
    description:
      "Daftar seserahan pernikahan yang umum beserta makna, kisaran harga, jumlah nampan ganjil, variasi adat Jawa, Sunda, Betawi, dan Minang, plus tips mengemas.",
    topic: "Seserahan",
    published: "2026-11-21",
    image: "/photos/pinterest/suvenir-anggrek.webp",
    imageAlt: "Suvenir dan hantaran berhias anggrek",
    readMinutes: 6,
    categories: ["hantaran"],
  },
  {
    slug: "checklist-persiapan-pernikahan",
    title: "Checklist persiapan pernikahan 12 bulan, dari lamaran sampai hari H",
    description:
      "Urutan persiapan pernikahan bulan demi bulan: kapan memesan venue, katering, MUA, fotografer, undangan, sampai technical meeting dan hari H.",
    topic: "Perencanaan",
    published: "2026-11-18",
    image: "/photos/pinterest/pasangan-sofa-bunga.webp",
    imageAlt: "Pasangan pengantin duduk di sofa berhias bunga",
    readMinutes: 7,
    categories: ["venue", "catering", "mua_attire", "photo_video"],
  },
  {
    slug: "cara-menyusun-anggaran-pernikahan",
    title: "Cara menyusun anggaran pernikahan supaya tidak membengkak",
    description:
      "Pembagian anggaran pernikahan per pos (venue dan katering, dekorasi, dokumentasi, rias), cara menghitung jumlah tamu, dan dana cadangan 10%.",
    topic: "Anggaran",
    published: "2026-11-18",
    updated: "2026-11-21",
    image: "/photos/pinterest/pelaminan-kristal.webp",
    imageAlt: "Pelaminan pernikahan dengan hiasan kristal",
    readMinutes: 8,
    categories: ["venue", "catering", "decor"],
  },
  {
    slug: "cara-memilih-venue-pernikahan",
    title: "Cara memilih venue pernikahan: 9 hal yang perlu dicek sebelum DP",
    description:
      "Kapasitas, tanggal, aturan vendor luar, parkir, listrik, cuaca, dan biaya tersembunyi. Daftar pertanyaan untuk dibawa saat survei venue pernikahan.",
    topic: "Venue",
    published: "2026-11-18",
    image: "/photos/pinterest/venue-joglo.webp",
    imageAlt: "Venue pernikahan berupa pendopo joglo",
    readMinutes: 6,
    categories: ["venue", "decor"],
  },
  {
    slug: "tips-memilih-vendor-pernikahan",
    title: "Tips memilih vendor pernikahan yang aman dan tepercaya",
    description:
      "Cara menilai portofolio dan ulasan, isi kesepakatan yang wajib tertulis, tanda bahaya vendor, dan cara membayar DP supaya uangmu terlindungi.",
    topic: "Vendor",
    published: "2026-11-18",
    image: "/photos/pinterest/dekorasi-taman.webp",
    imageAlt: "Dekorasi pernikahan di taman",
    readMinutes: 6,
    categories: ["photo_video", "mua_attire", "decor", "entertainment"],
  },
  {
    slug: "ragam-adat-pernikahan-indonesia",
    title: "Mengenal ragam adat pernikahan di Indonesia dan vendor yang dibutuhkan",
    description:
      "Rangkaian pernikahan adat Jawa, Sunda, Minang, Batak, Bugis, Betawi, dan Melayu, serta vendor apa saja yang perlu disiapkan untuk tiap adat.",
    topic: "Adat",
    published: "2026-11-18",
    image: "/photos/pinterest/kirab-malam.webp",
    imageAlt: "Kirab pengantin adat pada malam hari",
    readMinutes: 8,
    categories: ["mua_attire", "hantaran", "decor", "entertainment"],
  },
];

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** "18 November 2026" */
export function formatArticleDate(iso: string): string {
  return new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}
