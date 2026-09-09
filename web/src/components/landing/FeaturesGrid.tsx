import { Reveal } from "@/components/Reveal";

const FEATURES = [
  {
    title: "Direktori Vendor Terverifikasi",
    body: "Setiap vendor direview Admin sebelum tampil — dekorasi, MUA, fotografer, catering, dan lainnya.",
    icon: (
      <path d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Budget Planner Otomatis",
    body: "Masukkan total budget, langsung terbagi ke tiap kategori — geser slider untuk sesuaikan sendiri.",
    icon: <path d="M12 2v10l7 5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Wedding Planner Checklist",
    body: "Timeline H-12 bulan sampai hari-H, otomatis tercentang begitu kamu booking vendor terkait.",
    icon: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Chat & Booking Aman",
    body: "Semua diskusi dan kesepakatan tercatat di platform — bukti kuat kalau ada sengketa.",
    icon: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Escrow Payment Terlindungi",
    body: "DP & pelunasan ditahan platform lewat Midtrans — cair ke vendor setelah acara selesai dikonfirmasi.",
    icon: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Inspirasi Asli Indonesia",
    body: "Galeri kurasi foto pernikahan nyata — bukan hasil AI, bukan stok luar negeri.",
    icon: <path d="M4 16l4.5-6 3.5 4.5 2.5-3L20 16M4 5h16v14H4V5Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

export function FeaturesGrid() {
  return (
    <section className="bg-dc-offwhite py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-dc-navy">Semua yang Kamu Butuhkan</h2>
          <p className="mt-3 text-dc-black/60">Dari cari vendor sampai bayar aman — satu platform, satu alur.</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div className="h-full rounded-2xl border border-dc-black/5 bg-dc-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-dc-navy/5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-dc-navy/5 text-dc-navy">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {f.icon}
                  </svg>
                </div>
                <h3 className="font-heading mt-4 font-bold text-dc-navy">{f.title}</h3>
                <p className="mt-2 text-sm text-dc-black/60">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
