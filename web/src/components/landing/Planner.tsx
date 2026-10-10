import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";

const PLANNER_ITEMS = [
  { name: "Daftar tamu dan RSVP", body: "Kirim tautan RSVP, lihat siapa yang hadir." },
  { name: "Rundown acara", body: "Susun urutan acara dan jadwal kru." },
  { name: "Denah meja", body: "Tempatkan tamu per meja." },
  { name: "Budget", body: "Pantau anggaran dan pengeluaran booking." },
];

/** Asymmetric 7/5 composition: one dominant feature with an index list,
 * two smaller features stacked beside it. Not a card grid. */
export function Planner() {
  return (
    <section className="border-t border-dc-ink/10 bg-dc-white">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
        <Reveal className="lg:col-span-7">
          <h2 className="font-heading text-4xl leading-[1.05] text-dc-ink sm:text-6xl">
            Setelah booking, <span className="dc-em">persiapan tetap rapi</span> di satu akun.
          </h2>
          <p className="mt-5 max-w-lg leading-relaxed text-dc-ink/80">
            Wedding Planner ikut mengurus hal-hal di luar vendor, supaya kamu tidak perlu menyalin data ke spreadsheet.
          </p>
          <dl className="mt-10 border-t border-dc-ink/15">
            {PLANNER_ITEMS.map((i) => (
              <div key={i.name} className="grid gap-1 border-b border-dc-ink/15 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="font-heading text-2xl text-dc-ink">{i.name}</dt>
                <dd className="text-dc-ink/80 sm:self-center">{i.body}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="flex flex-col justify-end gap-10 lg:col-span-5">
          <div>
            <h3 className="font-heading text-3xl text-dc-ink">Chat dengan wedding consultant</h3>
            <p className="mt-2 leading-relaxed text-dc-ink/80">
              Ceritakan kebutuhan dan anggaranmu. Konsultan merekomendasikan vendor dari direktori dan bisa menjadwalkan meeting lanjutan.
            </p>
          </div>
          <div className="border-t border-dc-ink/15 pt-10">
            <h3 className="font-heading text-3xl text-dc-ink">Galeri inspirasi</h3>
            <p className="mt-2 leading-relaxed text-dc-ink/80">
              Foto pernikahan Indonesia yang dikurasi manual, bisa disaring per kategori.
            </p>
            <Link href="/inspirasi" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
              Buka galeri inspirasi
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
