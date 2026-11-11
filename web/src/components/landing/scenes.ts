// Hero worlds: one Nusantara wedding per scene. Backdrops ("worlds") are
// public-domain paintings and licensed photos (public/scene/<bg>-720|1400.webp
// copied from invitation.duacincin.id, and public/photos/latar/). Couples are
// real wedding photos from Wikimedia Commons taken at a pelaminan, palace or
// warm backdrop (no plain white studio walls), shown whole in the window of the
// gold gate (public/photos/pasangan/, 3:4 crops with headroom for the arch
// curve, one shared warm grade and soft vignette). They
// are not cut out: background removal ate hair and left wall patches, so the
// full photo is framed instead. Every third-party picture is listed on /kredit
// (components/kredit/credits.ts).
// `bg` and `couple` are base paths: append "-720.webp" / "-1400.webp" for the
// backdrop and ".webp" / "-sm.webp" (3:4) for the couple.
// `focus` keeps the subject in frame on wide and tall crops.

export type Credit = { kind: string; title: string; author: string; license: string; licenseUrl?: string; source: string };

export type World = { key: string; bg: string; focus: string; credit: Credit };

const BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0";
const BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0";

export const WORLDS = {
  java: {
    key: "java",
    bg: "/scene/java",
    focus: "50% 40%",
    credit: {
      kind: "Lukisan",
      title: "Javanese Landscape",
      author: "Raden Saleh",
      license: "Domain publik",
      source: "https://commons.wikimedia.org/wiki/File:Raden_Sarief_Bustaman_Saleh_-_Javanese_Landscape,_view_of_Merbabu_and_Merapi_(1862).jpg",
    },
  },
  sunda: {
    key: "sunda",
    bg: "/scene/sunda",
    focus: "50% 55%",
    credit: {
      kind: "Lukisan",
      title: "Pemandangan Priangan",
      author: "Abdullah Suriosubroto",
      license: "Domain publik",
      source: "https://commons.wikimedia.org/wiki/File:Abdullah_Suriosubroto_-_5204b95851.jpg",
    },
  },
  minang: {
    key: "minang",
    bg: "/scene/minang",
    focus: "50% 55%",
    credit: {
      kind: "Foto",
      title: "Istano Rajo Basa Pagaruyung",
      author: "Herusutimbul",
      license: "CC BY-SA 4.0",
      licenseUrl: BY_SA_4,
      source: "https://commons.wikimedia.org/wiki/File:Istano_Rajo_Basa_Pagaruyung.jpg",
    },
  },
  garden: {
    key: "garden",
    bg: "/scene/gardenparty",
    focus: "50% 50%",
    credit: {
      kind: "Lukisan",
      title: "The Artist's Garden in Giverny",
      author: "Claude Monet",
      license: "Domain publik",
      source: "https://commons.wikimedia.org/wiki/File:Claude_Monet_-_The_Artist%E2%80%99s_Garden_in_Giverny_-_1983.7.12_-_Yale_University_Art_Gallery.jpg",
    },
  },
  karo: {
    key: "karo",
    bg: "/photos/latar/karo",
    focus: "45% 60%",
    credit: {
      kind: "Foto",
      title: "Rumah adat Karo",
      author: "Bisajunisa",
      license: "CC BY-SA 4.0",
      licenseUrl: BY_SA_4,
      source: "https://commons.wikimedia.org/wiki/File:Bisa_Junisa_Munthe-Rumah_adat_Karo.jpg",
    },
  },
  maimun: {
    key: "maimun",
    bg: "/photos/latar/maimun",
    focus: "50% 50%",
    credit: {
      kind: "Foto",
      title: "Istana Maimoon",
      author: "Si Gam",
      license: "CC BY-SA 4.0",
      licenseUrl: BY_SA_4,
      source: "https://commons.wikimedia.org/wiki/File:Istana_Maimoon.jpg",
    },
  },
} satisfies Record<string, World>;

/** Backdrops in the order other sections index them (0 Jawa, 1 Sunda,
 * 2 Minang, 3 garden), plus the two hero-only worlds. */
export const WORLD_LIST: World[] = [WORLDS.java, WORLDS.sunda, WORLDS.minang, WORLDS.garden, WORLDS.karo, WORLDS.maimun];

export type Scene = World & {
  label: string;
  caption: string;
  couple: string;
  coupleAlt: string;
  coupleCredit: Credit;
};

export const SCENES: Scene[] = [
  {
    ...WORLDS.java,
    key: "jawa",
    label: "Jawa",
    caption: "Pengantin adat Jawa",
    couple: "/photos/pasangan/jawa",
    coupleAlt: "Pasangan pengantin Jawa berbusana beludru hitam bersulam emas dengan untaian melati",
    coupleCredit: {
      kind: "Foto",
      title: "Pengantin adat Jawa",
      author: "Inul21",
      license: "CC BY-SA 4.0",
      licenseUrl: BY_SA_4,
      source: "https://commons.wikimedia.org/wiki/File:Inul21.jpg",
    },
  },
  {
    ...WORLDS.minang,
    key: "minang",
    label: "Minang",
    caption: "Pengantin adat Minangkabau",
    couple: "/photos/pasangan/minang",
    coupleAlt: "Pasangan pengantin Minangkabau berbusana merah bersulam emas di depan pelaminan",
    coupleCredit: {
      kind: "Foto",
      title: "Pakaian Penganti Adat Sumatra Barat",
      author: "Rahmad Khairul",
      license: "CC BY-SA 4.0",
      licenseUrl: BY_SA_4,
      source: "https://commons.wikimedia.org/wiki/File:Pakaian_Penganti_Adat_Sumatra_Barat.jpg",
    },
  },
  {
    ...WORLDS.karo,
    key: "karo",
    label: "Batak",
    caption: "Pengantin adat Batak Karo",
    couple: "/photos/pasangan/karo",
    coupleAlt: "Pasangan pengantin Batak Karo berselempang uis merah di depan pelaminan berhias bunga",
    coupleCredit: {
      kind: "Foto",
      title: "Batak Karo Wedding",
      author: "Picsplease",
      license: "CC BY-SA 3.0",
      licenseUrl: BY_SA_3,
      source: "https://commons.wikimedia.org/wiki/File:Batak_Karo_Wedding.jpg",
    },
  },
  {
    ...WORLDS.maimun,
    key: "melayu",
    label: "Melayu",
    caption: "Pengantin Melayu Deli di Istana Maimun",
    couple: "/photos/pasangan/melayu",
    coupleAlt: "Pasangan pengantin Melayu Deli berbusana merah keemasan di depan singgasana Istana Maimun",
    coupleCredit: {
      kind: "Foto",
      title: "Pengantin Melayu Deli",
      author: "Alberttito",
      license: "CC BY-SA 4.0",
      licenseUrl: BY_SA_4,
      source: "https://commons.wikimedia.org/wiki/File:Pengantin_Melayu_Deli.jpg",
    },
  },
];
