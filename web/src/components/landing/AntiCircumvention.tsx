import { ParallaxImage } from "@/components/landing/ParallaxImage";

export function AntiCircumvention() {
  return (
    <section className="relative overflow-hidden bg-dc-navy py-20">
      <ParallaxImage
        src="/hero/adat/melayu.webp"
        alt="Pasangan pengantin adat Melayu"
        className="-left-10 bottom-0 hidden h-72 w-56 xl:block"
        speed={30}
        rotate={4}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-3xl font-extrabold text-dc-white">
            Vendornya Terbuka, Transaksinya Tetap Terlindungi
          </h2>
          <p className="mt-4 text-dc-white/70">
            Kamu bebas jelajahi portofolio vendor tanpa login. Begitu mulai chat, booking, dan bayar, semua tetap
            berjalan di dalam DuaCincin, supaya kamu dapat perlindungan escrow, bukti chat yang tercatat, dan jalur
            sengketa resmi kalau ada masalah.
          </p>
        </div>

        <ul className="divide-y divide-dc-white/10 rounded-2xl border border-dc-white/10">
          {[
            { title: "Client Terlindungi", body: "Dana ditahan escrow, cair ke vendor cuma setelah acara selesai dikonfirmasi." },
            { title: "Vendor Terlindungi", body: "Kesepakatan tercatat resmi, komisi jelas, pembayaran terjamin lewat platform." },
            { title: "Bukti Kuat", body: "Semua chat & kesepakatan tersimpan, jadi alat bukti kalau terjadi sengketa." },
            { title: "Mitra Terikat Aturan", body: "Setiap vendor menyetujui Perjanjian Kemitraan sebelum aktif menerima booking." },
          ].map((item) => (
            <li key={item.title} className="p-5">
              <h3 className="font-heading font-bold text-dc-gold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-dc-white/70">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
