import { Reveal } from "@/components/Reveal";

const STEPS = [
  {
    title: "Cari & Chat",
    body: "Jelajahi direktori vendor per kategori, diskusikan kebutuhanmu langsung lewat chat aman DuaCincin.",
  },
  {
    title: "Booking & DP",
    body: "Sepakat harga, ajukan booking, bayar DP lewat escrow — dana ditahan platform, bukan langsung ke vendor.",
  },
  {
    title: "Rencanakan Bersama",
    body: "Susun budget otomatis, checklist Wedding Planner, dan jadwalkan technical meeting dengan vendor.",
  },
  {
    title: "Hari Bahagia",
    body: "Lunasi pembayaran, vendor menjalankan tugasnya — dana baru cair ke vendor setelah acara selesai.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <Reveal className="mx-auto max-w-xl text-center">
        <h2 className="font-heading text-3xl font-extrabold text-dc-navy">Cara Kerjanya</h2>
        <p className="mt-3 text-dc-black/60">Empat langkah, dari cari vendor sampai hari-H — semua tercatat dan terlindungi.</p>
      </Reveal>

      <div className="relative mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="absolute top-6 left-0 right-0 hidden h-px bg-dc-black/10 lg:block" />
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 100} className="relative text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-dc-navy font-heading text-lg font-extrabold text-dc-gold">
              {i + 1}
            </div>
            <h3 className="font-heading mt-4 font-bold text-dc-navy">{step.title}</h3>
            <p className="mt-2 text-sm text-dc-black/60">{step.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
