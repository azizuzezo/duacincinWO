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
    image: "/photos/pinterest/pelaminan-kristal.webp",
    imageAlt: "Pelaminan pernikahan dengan hiasan kristal",
    readMinutes: 6,
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
