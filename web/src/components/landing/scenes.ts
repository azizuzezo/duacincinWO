// Hero worlds: one Nusantara (or international) wedding per scene. Backdrops
// are the same licensed paintings/photos the invitation site uses
// (public/scene/<bg>-720|1400.webp, copied from invitation.duacincin.id
// public/assets/landing); couples and the floral arch are the owner's real
// cutouts (WO repo root *.webp, resized into public/scene/).
// `focus` keeps the subject in frame on wide and tall crops.

export type Credit = { kind: string; title: string; author: string; license: string; licenseUrl?: string; source: string };

export type Scene = {
  key: string;
  label: string;
  caption: string;
  bg: string;
  focus: string;
  couple: string;
  coupleAlt: string;
  credit: Credit;
};

export const SCENES: Scene[] = [
  {
    key: "jawa",
    label: "Jawa",
    caption: "Busana adat Jawa",
    bg: "java",
    focus: "50% 40%",
    couple: "jawa",
    coupleAlt: "Pasangan pengantin berbusana adat Jawa",
    credit: {
      kind: "Lukisan",
      title: "Javanese Landscape",
      author: "Raden Saleh",
      license: "Domain publik",
      source: "https://commons.wikimedia.org/wiki/File:Raden_Sarief_Bustaman_Saleh_-_Javanese_Landscape,_view_of_Merbabu_and_Merapi_(1862).jpg",
    },
  },
  {
    key: "sunda",
    label: "Sunda",
    caption: "Busana adat Sunda",
    bg: "sunda",
    focus: "50% 55%",
    couple: "sunda",
    coupleAlt: "Pasangan pengantin berbusana adat Sunda",
    credit: {
      kind: "Lukisan",
      title: "Pemandangan Priangan",
      author: "Abdullah Suriosubroto",
      license: "Domain publik",
      source: "https://commons.wikimedia.org/wiki/File:Abdullah_Suriosubroto_-_5204b95851.jpg",
    },
  },
  {
    key: "minang",
    label: "Minang",
    caption: "Busana adat Minangkabau",
    bg: "minang",
    focus: "50% 55%",
    couple: "minang",
    coupleAlt: "Pasangan pengantin berbusana adat Minangkabau",
    credit: {
      kind: "Foto",
      title: "Istano Rajo Basa Pagaruyung",
      author: "Herusutimbul",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      source: "https://commons.wikimedia.org/wiki/File:Istano_Rajo_Basa_Pagaruyung.jpg",
    },
  },
  {
    key: "internasional",
    label: "Internasional",
    caption: "Gaun dan jas pengantin",
    bg: "gardenparty",
    focus: "50% 50%",
    couple: "barat",
    coupleAlt: "Pasangan pengantin bergaun putih dan berjas",
    credit: {
      kind: "Lukisan",
      title: "The Artist's Garden in Giverny",
      author: "Claude Monet",
      license: "Domain publik",
      source: "https://commons.wikimedia.org/wiki/File:Claude_Monet_-_The_Artist%E2%80%99s_Garden_in_Giverny_-_1983.7.12_-_Yale_University_Art_Gallery.jpg",
    },
  },
];
