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
  /** Where the original lives; absent for pictures we generated ourselves. */
  source?: string;
  /** What we changed. */
  change: string;
};

export type CreditGroup = { id: string; title: string; note: string; items: PhotoCredit[] };

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
    note: "Foto pasangan pengantin tampil utuh di jendela gapura emas, di depan lukisan atau foto daerahnya.",
    items: [
      ...SCENES.map((s) => ({
        thumb: `${s.couple}-sm.webp`,
        what: s.coupleAlt,
        title: s.coupleCredit.title,
        author: s.coupleCredit.author,
        license: s.coupleCredit.license,
        licenseUrl: s.coupleCredit.licenseUrl,
        source: s.coupleCredit.source,
        change: "Dipotong tegak 3:4, diberi nada warna hangat dan vinyet tipis, diperkecil",
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
    id: "pinterest",
    title: "Beranda: foto dari board Pinterest DuaCincin",
    note: "Kategori vendor (beranda, direktori vendor, halaman kategori, untuk vendor, galeri inspirasi), wedding consultant, budget planner, dan penutup beranda. Diambil dari board Pinterest resmi DuaCincin; tiap judul membuka pin aslinya.",
    items: [
      {
        thumb: "/photos/pinterest/venue-joglo-sm.webp",
        what: "Joglo di perbukitan dekat Borobudur untuk akad di taman (kategori venue)",
        title: "Wedding venue di Borobudur",
        author: "FORNIA, venue @pl.borobudur",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172932/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/rias-hijab-sm.webp",
        what: "Pengantin berhijab dengan mahkota bunga emas (kategori rias dan busana)",
        title: "Pin rias pengantin berhijab",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702173050/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/katering-jajanan-sm.webp",
        what: "Meja jajanan tradisional di atas daun pisang (kategori katering)",
        title: "Pin meja jajanan",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702173003/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/dekorasi-taman-sm.webp",
        what: "Panggung taman putih dengan lilin dan lampu gantung (kategori dekorasi)",
        title: "Pin dekorasi taman",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172898/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/foto-gapura-sm.webp",
        what: "Pasangan pengantin di bawah gapura bunga matahari (kategori foto dan video)",
        title: "Pin pasangan di gapura bunga",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172998/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/kirab-malam-sm.webp",
        what: "Kirab pengantin malam hari di antara tamu (kategori hiburan)",
        title: "The details",
        author: "foto @dinemaphoto, wedding design @yoantaway.project",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702173055/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/suvenir-anggrek-sm.webp",
        what: "Kotak suvenir berhias anggrek putih (kategori undangan dan suvenir)",
        title: "Phalaenopsis orchid + gold metal leaves",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172967/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/konsultan-rias-sm.webp",
        what: "Penata rias menyiapkan pengantin sebelum akad (bagian wedding consultant)",
        title: "Beauty shoot moment akad nikah",
        author: "MUA @dwikartika_makeup, foto @rimmpro_",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702173046/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/pasangan-sofa-bunga-sm.webp",
        what: "Pasangan pengantin di sofa berlatar bunga merah (bagian untuk vendor)",
        title: "Pin pasangan di dinding bunga",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172994/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/resepsi-taman-sm.webp",
        what: "Resepsi taman dengan untaian lampu (latar budget planner)",
        title: "Pin resepsi taman",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172917/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/penutup-lilin-sm.webp",
        what: "Meja resepsi dengan lilin dan bunga (latar penutup beranda)",
        title: "Pin meja resepsi berlilin",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702173009/",
        change: "Diperkecil",
      },
    ],
  },
  {
    id: "halaman",
    title: "Halaman lain: cara kerja, bantuan, inspirasi, dan gambar pratinjau",
    note: "Diambil dari board Pinterest resmi DuaCincin; tiap judul membuka pin aslinya.",
    items: [
      {
        thumb: "/photos/pinterest/akad-joglo-lorong-sm.webp",
        what: "Pengantin berjalan di lorong bunga putih menuju joglo di perbukitan (sampul cara kerja)",
        title: "Pin akad di joglo perbukitan",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172930/",
        change: "Dipotong sedikit di tepi dan diperkecil",
      },
      {
        thumb: "/photos/pinterest/pendopo-kursi-tamu-sm.webp",
        what: "Pendopo beratap joglo dengan deretan kursi tamu di taman (sampul pusat bantuan)",
        title: "Pin pendopo dan kursi tamu",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172906/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/pelaminan-kristal-sm.webp",
        what: "Pelaminan putih dengan lampu kristal dan bunga gantung (gambar pratinjau tautan)",
        title: "Pin pelaminan lampu kristal",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702173034/",
        change: "Diperkecil",
      },
      {
        thumb: "/photos/pinterest/pasangan-internasional-sm.webp",
        what: "Pasangan bergaun putih dan jas hitam di antara bunga putih (galeri inspirasi)",
        title: "Pin pasangan bergaun putih",
        author: "pemilik aslinya, via Pinterest",
        license: "Hak cipta pemilik foto",
        source: "https://www.pinterest.com/pin/605452743702172889/",
        change: "Diperkecil",
      },
    ],
  },
  {
    id: "banner-ai",
    title: "Gambar yang dibuat dengan AI",
    note: "Latar banner beranda, header halaman, dan lima gambar kategori dibuat dengan AI oleh DuaCincin. Isinya benda dan dekorasi tanpa orang, bukan karya vendor mana pun dan bukan foto acara sungguhan.",
    items: [
      {
        thumb: "/photos/kategori-ai/hantaran-sm.webp",
        what: "Kotak seserahan berhias mawar putih (kategori Hantaran & Seserahan)",
        title: "Ilustrasi kategori Hantaran & Seserahan",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/photos/kategori-ai/mc-sm.webp",
        what: "Mikrofon emas di depan panggung pelaminan (kategori MC)",
        title: "Ilustrasi kategori MC",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/photos/kategori-ai/content-creator-sm.webp",
        what: "Ponsel di gimbal, kamera, dan ring light (kategori Wedding Content Creator)",
        title: "Ilustrasi kategori Wedding Content Creator",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/photos/kategori-ai/mobil-sm.webp",
        what: "Mobil pengantin klasik berhias bunga (kategori Mobil Pengantin)",
        title: "Ilustrasi kategori Mobil Pengantin",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/photos/kategori-ai/kue-sm.webp",
        what: "Kue pengantin empat tingkat (kategori Kue Pengantin)",
        title: "Ilustrasi kategori Kue Pengantin",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/tentang.webp",
        what: "Meja studio perencanaan dengan cincin dan bunga (header Tentang kami)",
        title: "Ilustrasi header Tentang kami",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/bantuan.webp",
        what: "Ponsel, teh melati, dan buku catatan (header Bantuan)",
        title: "Ilustrasi header Bantuan",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/artikel.webp",
        what: "Majalah dan buku panduan pernikahan (header Artikel)",
        title: "Ilustrasi header Artikel",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/inspirasi.webp",
        what: "Papan moodboard dekorasi pernikahan (header Inspirasi)",
        title: "Ilustrasi header Inspirasi",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/legal.webp",
        what: "Dokumen, pena, dan segel lilin (header halaman legal)",
        title: "Ilustrasi header halaman legal",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/kredit.webp",
        what: "Kamera dan cetakan foto (header Kredit foto)",
        title: "Ilustrasi header Kredit foto",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/escrow-sm.webp",
        what: "Dua cincin emas di atas kain sutra champagne dengan amplop bersegel lilin",
        title: "Ilustrasi banner escrow",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/rencana-sm.webp",
        what: "Meja perencanaan dengan buku catatan, contoh warna kain, dan mawar putih",
        title: "Ilustrasi banner rencana",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/banner/vendor-sm.webp",
        what: "Venue resepsi bernuansa pendopo saat senja, sebelum tamu datang",
        title: "Ilustrasi banner vendor",
        author: "DuaCincin, dibuat dengan AI (Figma AI, model gpt-image)",
        license: "Milik DuaCincin",
        change: "Dibuat November 2026, diperkecil dan dikonversi ke WebP",
      },
    ],
  },
  {
    id: "digital-invitation",
    title: "Beranda: tema DuaCincin Digital Invitation",
    note: "Tangkapan layar tema dari invitation.duacincin.id, produk DuaCincin sendiri. Lukisan dan foto di dalam tema dikreditkan di situs tersebut.",
    items: [
      {
        thumb: "/invitation/classic.webp",
        what: "Halaman pembuka undangan tema Klasik",
        title: "Tema Klasik",
        author: "DuaCincin Digital Invitation",
        license: "Milik DuaCincin",
        source: "https://invitation.duacincin.id",
        change: "Diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/invitation/java.webp",
        what: "Halaman pembuka undangan tema Jawa",
        title: "Tema Jawa",
        author: "DuaCincin Digital Invitation",
        license: "Milik DuaCincin",
        source: "https://invitation.duacincin.id",
        change: "Diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/invitation/royal.webp",
        what: "Halaman pembuka undangan tema Royal",
        title: "Tema Royal",
        author: "DuaCincin Digital Invitation",
        license: "Milik DuaCincin",
        source: "https://invitation.duacincin.id",
        change: "Diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/invitation/gardenparty.webp",
        what: "Halaman pembuka undangan tema Garden Party",
        title: "Tema Garden Party",
        author: "DuaCincin Digital Invitation",
        license: "Milik DuaCincin",
        source: "https://invitation.duacincin.id",
        change: "Diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/invitation/luminousgate.webp",
        what: "Halaman pembuka undangan tema Luminous Gate",
        title: "Tema Luminous Gate",
        author: "DuaCincin Digital Invitation",
        license: "Milik DuaCincin",
        source: "https://invitation.duacincin.id",
        change: "Diperkecil dan dikonversi ke WebP",
      },
      {
        thumb: "/invitation/sakura.webp",
        what: "Halaman pembuka undangan tema Sakura",
        title: "Tema Sakura",
        author: "DuaCincin Digital Invitation",
        license: "Milik DuaCincin",
        source: "https://invitation.duacincin.id",
        change: "Diperkecil dan dikonversi ke WebP",
      },
    ],
  },
];
