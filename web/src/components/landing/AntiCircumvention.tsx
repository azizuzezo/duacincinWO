import { Reveal } from "@/components/Reveal";

export function AntiCircumvention() {
  return (
    <section className="bg-dc-navy py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-2">
        <Reveal>
          <span className="inline-block rounded-full bg-dc-gold/15 px-4 py-1 text-xs font-semibold tracking-wide text-dc-gold uppercase">
            Kenapa Beda
          </span>
          <h2 className="font-heading mt-4 text-3xl font-extrabold text-dc-white">
            Kenapa Nama Vendor Disembunyikan Sampai Kamu Login?
          </h2>
          <p className="mt-4 text-dc-white/70">
            Supaya seluruh transaksi — diskusi, booking, sampai pembayaran — tetap berada di dalam DuaCincin. Itu
            artinya kamu dapat perlindungan escrow, bukti chat yang tercatat, dan jalur sengketa resmi kalau ada
            masalah. Bukan sekadar direktori kontak.
          </p>
        </Reveal>

        <Reveal delay={150} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { title: "Client Terlindungi", body: "Dana ditahan escrow, cair ke vendor cuma setelah acara selesai dikonfirmasi." },
            { title: "Vendor Terlindungi", body: "Kesepakatan tercatat resmi, komisi jelas, pembayaran terjamin lewat platform." },
            { title: "Bukti Kuat", body: "Semua chat & kesepakatan tersimpan — jadi alat bukti kalau terjadi sengketa." },
            { title: "Mitra Terikat Aturan", body: "Setiap vendor menyetujui Perjanjian Kemitraan sebelum aktif menerima booking." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-dc-white/10 bg-dc-white/5 p-5">
              <h3 className="font-heading font-bold text-dc-gold">{item.title}</h3>
              <p className="mt-2 text-sm text-dc-white/70">{item.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
