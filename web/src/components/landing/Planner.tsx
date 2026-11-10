import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";

const PLANNER_ITEMS = [
  { name: "Daftar tamu dan RSVP", body: "Kirim tautan RSVP, lihat siapa yang hadir." },
  { name: "Rundown acara", body: "Susun urutan acara dan jadwal kru." },
  { name: "Denah meja", body: "Tempatkan tamu per meja." },
  { name: "Budget", body: "Pantau anggaran dan pengeluaran booking." },
  { name: "Checklist", body: "Tugas persiapan dengan status dan tenggat." },
];

/** Editorial index of the planner tools (a definition list, not cards), with
 * the inspiration gallery as a quieter aside. */
export function Planner() {
  return (
    <section aria-labelledby="planner-judul" className="bg-dc-ivory">
      <div className="dc-container grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16 lg:py-32">
        <Reveal className="lg:col-span-7">
          <p className="dc-eyebrow">Wedding planner</p>
          <h2 id="planner-judul" className="mt-4 font-heading text-[clamp(2.4rem,4.8vw,4.2rem)] leading-[1.02] text-dc-ink">
            Setelah booking, <span className="dc-em">persiapan tetap rapi</span> di satu akun.
          </h2>
          <p className="mt-5 max-w-lg leading-relaxed text-dc-text-2">
            Wedding Planner ikut mengurus hal-hal di luar vendor, supaya kamu tidak perlu menyalin data ke spreadsheet.
          </p>
          <dl className="dc-stagger mt-10 border-t border-dc-line-strong">
            {PLANNER_ITEMS.map((i) => (
              <div key={i.name} className="grid gap-1 border-b border-dc-line-strong py-5 sm:grid-cols-[15rem_1fr] sm:gap-6">
                <dt className="font-heading text-[1.75rem] leading-tight text-dc-ink">{i.name}</dt>
                <dd className="text-dc-text-2 sm:self-center">{i.body}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal className="flex flex-col justify-end lg:col-span-5" delay={0.1}>
          <div className="rounded-2xl border border-dc-line bg-dc-white p-7 shadow-soft">
            <h3 className="font-heading text-[2rem] leading-tight text-dc-ink">Galeri inspirasi</h3>
            <p className="mt-2 leading-relaxed text-dc-text-2">Foto pernikahan Indonesia yang dikurasi manual, bisa disaring per kategori.</p>
            <Link href="/inspirasi" className="mt-4 inline-flex min-h-11 items-center font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
              Buka galeri inspirasi
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
