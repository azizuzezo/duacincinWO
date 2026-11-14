// The people behind DuaCincin. Shown on /tentang-kami
// (components/landing/Founders.tsx). Photos are the founders' own, supplied
// by them: public/team/*.webp, square, head and shoulders.
export type Founder = {
  name: string;
  /** Second name in another script (shown beside the name, own lang). */
  altName?: { text: string; lang: string };
  role: string;
  photo: string;
  bio: string;
  links?: { label: string; href: string }[];
};

export const FOUNDERS: Founder[] = [
  {
    name: "Abdul Aziz Setiawan",
    altName: { text: "王毅成", lang: "zh-Hans" },
    role: "Co-Founder, produk dan teknologi",
    photo: "/team/abdul-aziz-setiawan-hd.webp",
    bio: "Customer Experience | AI Application Developer di Skor Technologies, dengan 9 tahun di layanan pelanggan. Membangun platform duacincin.id dan DuaCincin Invitation.",
    links: [
      { label: "Portofolio", href: "https://portoaziz.my.id" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/abdazizs/" },
    ],
  },
  {
    name: "Riyan Riyadi",
    role: "Co-Founder, customer experience dan wedding analyst",
    photo: "/team/riyan-riyadi-hd.webp",
    bio: "Leading customer experience dan Wedding Analyst. Mengembangkan Dua Cincin untuk membantu calon pengantin menemukan vendor sesuai kebutuhan dan anggaran.",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/riyanriyadi/" }],
  },
];
