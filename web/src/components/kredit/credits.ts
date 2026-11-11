// Every third-party picture on the public site, grouped by where it appears.
// Rendered by /kredit. Licences were checked on each Wikimedia Commons file
// page. CC BY-SA pictures we cropped or resized stay under the same
// licence (ShareAlike); the change is named in `change`.

import { SCENES, WORLDS, type World } from "@/components/landing/scenes";

export type PhotoCredit = {
  /** Small preview shown next to the credit. */
  thumb: string;
  /** Plain description in Indonesian. */
  what: string;
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
  /** What we changed. */
  change: string;
};

export type CreditGroup = { id: string; title: string; note: string; items: PhotoCredit[] };

const BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0";
const BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0";
const PD = "https://creativecommons.org/publicdomain/mark/1.0/";

function world(w: World, what: string, change: string): PhotoCredit {
  return {
    thumb: `${w.bg}-720.webp`,
    what,
    title: w.credit.title,
    author: w.credit.author,
    license: w.credit.license,
    licenseUrl: w.credit.licenseUrl ?? (w.credit.license === "Domain publik" ? PD : undefined),
    source: w.credit.source,
    change,
  };
}

export const CREDIT_GROUPS: CreditGroup[] = [
  {
    id: "beranda",
    title: "Beranda, masuk dan daftar",
    note: "Foto pasangan pengantin tampil utuh dalam bingkai lengkung, di depan lukisan atau foto daerahnya.",
    items: [
      ...SCENES.map((s) => ({
        thumb: `${s.couple}-sm.webp`,
        what: s.coupleAlt,
        title: s.coupleCredit.title,
        author: s.coupleCredit.author,
        license: s.coupleCredit.license,
        licenseUrl: s.coupleCredit.licenseUrl,
        source: s.coupleCredit.source,
        change: "Dipotong tegak 3:4 dan diperkecil",
      })),
      world(WORLDS.java, "Lukisan pemandangan Jawa dengan Gunung Merbabu dan Merapi", "Diperkecil, diberi nada warna hangat di halaman"),
      world(WORLDS.sunda, "Lukisan sawah dan gunung di tanah Priangan", "Diperkecil, diberi nada warna hangat di halaman"),
      world(WORLDS.karo, "Rumah adat Karo beratap ijuk di bawah langit biru", "Diperkecil"),
      world(WORLDS.maimun, "Istana Maimun di Medan dengan taman di depannya", "Dipotong dan diperkecil"),
      world(WORLDS.minang, "Istano Basa Pagaruyung di Sumatra Barat", "Diperkecil"),
      world(WORLDS.garden, "Lukisan taman bunga di Giverny", "Diperkecil"),
    ],
  },
  {
    id: "kategori",
    title: "Kategori vendor",
    note: "Dipakai di beranda, direktori vendor, halaman kategori, untuk vendor, dan galeri inspirasi.",
    items: [
      {
        thumb: "/photos/kategori/venue-720.webp",
        what: "Gedung resepsi di Jakarta dengan lampu gantung dan lorong bunga",
        title: "Chandeliers at a wedding reception hall, Jakarta, Indonesia",
        author: "Pravito",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Chandeliers_at_a_wedding_reception_hall,_Jakarta,_Indonesia.jpg",
        change: "Dipotong, warna dan kecerahan disesuaikan, diperkecil",
      },
      {
        thumb: "/photos/kategori/dekorasi-720.webp",
        what: "Pelaminan adat Minangkabau berukir emas",
        title: "Pelaminan Minangkabau",
        author: "Abdul harits",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Pelaminan_Minangkabau.jpg",
        change: "Dipotong, warna dan kecerahan disesuaikan, diperkecil",
      },
      {
        thumb: "/photos/kategori/katering-720.webp",
        what: "Tumpeng nasi kuning dengan lauk pauk",
        title: "Tumpeng Kompas 1",
        author: "Gunawan Kartapranata",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Tumpeng_Kompas_1.jpg",
        change: "Dipotong, warna dan kecerahan disesuaikan, diperkecil",
      },
      {
        thumb: "/photos/kategori/rias-720.webp",
        what: "Riasan pengantin putri Jember Pendalungan",
        title: "Tata rias pengantin putri Jember Pendalungan",
        author: "Curah Manis Studio",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Tata_rias_pengantin_putri_Jember_Pendalungan.png",
        change: "Dipotong, warna dan kecerahan disesuaikan, diperkecil",
      },
      {
        thumb: "/photos/kategori/foto-720.webp",
        what: "Potret pengantin Bali bermahkota emas",
        title: "Balinese bride and groom",
        author: "KitHamilton",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Balinese_bride_and_groom.jpg",
        change: "Dipotong, warna dan kecerahan disesuaikan, diperkecil",
      },
      {
        thumb: "/photos/kategori/hiburan-720.webp",
        what: "Pemain gamelan Jawa di Yogyakarta",
        title: "Wayang Performance in Yogyakarta, Java 1050",
        author: "Michael Gunther",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Wayang_Performance_in_Yogyakarta,_Java_1050.jpg",
        change: "Dipotong, warna dan kecerahan disesuaikan, diperkecil",
      },
      {
        thumb: "/photos/kategori/suvenir-720.webp",
        what: "Undangan pernikahan cetak berhias bunga mawar",
        title: "Undangan pernikahan vintage",
        author: "Kartu undangan pernikahan",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Undangan_pernikahan_vintage.jpg",
        change: "Dipotong, warna dan kecerahan disesuaikan, diperkecil",
      },
    ],
  },
  {
    id: "momen",
    title: "Foto suasana",
    note: "Latar bagian anggaran, wedding consultant, penutup beranda, dan halaman cara kerja.",
    items: [
      {
        thumb: "/photos/momen/sunda-lengkung-1000.webp",
        what: "Pasangan pengantin Sunda di bingkai lengkung (beranda, konsultan)",
        title: "Wedding in action",
        author: "Latifah payet",
        license: "CC BY-SA 3.0",
        licenseUrl: BY_SA_3,
        source: "https://commons.wikimedia.org/wiki/File:Wedding_in_action.JPG",
        change: "Dipotong tegak 4:5, latar di atas kepala diperpanjang, diperkecil",
      },
      {
        thumb: "/photos/momen/resepsi-mandar-720.webp",
        what: "Keluarga pengantin berbusana adat Bugis di pelaminan",
        title: "Pernikahan Adat Bugis di Tanah Mandar",
        author: "Buregsandeq",
        license: "CC BY-SA 3.0",
        licenseUrl: BY_SA_3,
        source: "https://commons.wikimedia.org/wiki/File:Pernikahan_Adat_Bugis_di_Tanah_Mandar.JPG",
        change: "Diperkecil, digelapkan di halaman agar teks terbaca",
      },
      {
        thumb: "/photos/momen/jember-tertawa-720.webp",
        what: "Pasangan pengantin Jember Sari tertawa bersama",
        title: "Penampilan Pasangan Pengantin Jember Sari sedang tertawa",
        author: "Curah Manis Studio",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Penampilan_Pasangan_Pengantin_Jember_Sari_sedang_tertawa.png",
        change: "Diperkecil, dipotong berbentuk lengkung di halaman",
      },
      {
        thumb: "/photos/momen/melayu-istana-720.webp",
        what: "Pengantin Melayu Deli di Istana Maimun",
        title: "Pengantin Memakai Pakaian Adat Melayu Deli",
        author: "Alberttito",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Pengantin_Memakai_Pakaian_Adat_Melayu_Deli.jpg",
        change: "Diperkecil, digelapkan di halaman agar teks terbaca",
      },
    ],
  },
  {
    id: "adat",
    title: "Galeri inspirasi: busana adat",
    note: "Foto bulat untuk pilihan adat dan jendela lengkung di atas galeri inspirasi.",
    items: [
      {
        thumb: "/photos/adat/jawa-720.webp",
        what: "Pengantin Jember Sari, Jawa Timur",
        title: "Visualisasi Pasangan Pengantin Jember Sari 5",
        author: "Curah Manis Studio",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Visualisasi_Pasangan_Pengantin_Jember_Sari_5.png",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/sunda-720.webp",
        what: "Pengantin Sunda bermahkota siger",
        title: "Wedding in action",
        author: "Latifah payet",
        license: "CC BY-SA 3.0",
        licenseUrl: BY_SA_3,
        source: "https://commons.wikimedia.org/wiki/File:Wedding_in_action.JPG",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/minang-720.webp",
        what: "Pengantin Minangkabau di pelaminan",
        title: "Pakaian Penganti Adat Sumatra Barat",
        author: "Rahmad Khairul",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Pakaian_Penganti_Adat_Sumatra_Barat.jpg",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/bugis-720.webp",
        what: "Pengantin Bugis berbaju bodo",
        title: "Mariés aux célèbes",
        author: "Yves Picq",
        license: "CC BY-SA 3.0",
        licenseUrl: BY_SA_3,
        source: "https://commons.wikimedia.org/wiki/File:Mari%C3%A9s_aux_c%C3%A9l%C3%A8bes.jpg",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/batak-720.webp",
        what: "Pengantin Batak Karo",
        title: "Pakaian Pernikahan Adat Karo",
        author: "Sokokuphoto",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Pakaian_Pernikahan_Adat_Karo.jpg",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/bali-720.webp",
        what: "Pengantin Bali",
        title: "Balinese bride and groom",
        author: "KitHamilton",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Balinese_bride_and_groom.jpg",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/dayak-720.webp",
        what: "Pengantin Dayak Iban di Kapuas Hulu, Kalimantan Barat",
        title: "Iban Dayak Couple",
        author: "Asang Lawai",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Iban_Dayak_Couple.jpg",
        change: "Dipotong tegak 3:4",
      },
      {
        thumb: "/photos/adat/melayu-720.webp",
        what: "Pengantin Melayu Deli",
        title: "Pengantin Memakai Pakaian Adat Melayu Deli",
        author: "Alberttito",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Pengantin_Memakai_Pakaian_Adat_Melayu_Deli.jpg",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/betawi-720.webp",
        what: "Pengantin Betawi",
        title: "Betawi wedding",
        author: "Yulivan S. Saaba",
        license: "CC BY-SA 3.0",
        licenseUrl: BY_SA_3,
        source: "https://commons.wikimedia.org/wiki/File:Betawi_wedding.jpg",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
      {
        thumb: "/photos/adat/internasional-720.webp",
        what: "Pasangan bergaun dan berkemeja di bawah gapura bunga, Bali",
        title: "Couple at a wedding ceremony in Indonesia",
        author: "Maxinick11",
        license: "CC BY-SA 4.0",
        licenseUrl: BY_SA_4,
        source: "https://commons.wikimedia.org/wiki/File:Couple_at_a_wedding_ceremony_in_Indonesia.jpg",
        change: "Dipotong tegak 3:4 dan diperkecil",
      },
    ],
  },
];
