import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";

export const metadata: Metadata = {
  title: "Bantuan dan pertanyaan umum",
  description: "Jawaban atas pertanyaan yang sering muncul soal escrow, booking, sengketa, dan akun vendor di DuaCincin.",
};

const FAQ = [
  { q: "Kapan uangku sampai ke vendor?", a: "Hanya setelah kamu mengonfirmasi acara selesai. Sebelum itu, DP dan pelunasan ditahan di akun penampung DuaCincin. Setelah dikonfirmasi, dana diteruskan ke vendor dikurangi komisi platform." },
  { q: "Boleh bayar langsung ke rekening vendor?", a: "Tidak disarankan. Pembayaran di luar DuaCincin tidak dilindungi escrow dan tidak tercatat kalau terjadi sengketa. Vendor juga terikat perjanjian yang melarang transaksi di luar platform." },
  { q: "Kenapa nomor telepon vendor tidak ditampilkan?", a: "Komunikasi berlangsung lewat chat DuaCincin supaya semua kesepakatan harga, tanggal, dan paket tercatat. Nomor, email, dan tautan luar yang dibagikan di chat ditandai untuk ditinjau Admin, tapi pesannya tetap terkirim." },
  { q: "Apakah harus login untuk melihat vendor?", a: "Tidak. Profil dan portofolio vendor terbuka untuk siapa saja. Akun baru dibutuhkan saat kamu mau chat dengan vendor atau mengajukan booking." },
  { q: "Apa itu wedding consultant, dan apakah wajib?", a: "Konsultan adalah staf DuaCincin yang membantu memilih vendor lewat chat, dan bisa mendampingi lewat sesi meeting. Ini opsional: kamu boleh mencari dan menghubungi vendor sendiri." },
  { q: "Bagaimana kalau terjadi sengketa dengan vendor?", a: "Riwayat chat dan booking menjadi rujukan. Kamu bisa melaporkannya, lalu Admin menengahi lewat antrian sengketa. Ketentuan lengkapnya ada di Ketentuan Layanan Client." },
  { q: "Bagaimana usaha saya bisa tampil di direktori?", a: "Daftar sebagai vendor, setujui Perjanjian Kemitraan, dan unggah dokumen legalitas. Profilmu muncul di direktori setelah Admin menyetujuinya." },
];

export default function BantuanPage() {
  return (
    <PublicShell>
      <PageHero
        image="/stock/ballroom.webp"
        title={
          <>
            Ada yang <span className="dc-em-light">belum jelas?</span>
          </>
        }
        subtitle="Jawaban atas pertanyaan yang paling sering muncul soal pembayaran, booking, dan akun."
      />
      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
        <div className="lg:col-span-7">
          <div className="border-b border-dc-ink/15">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-t border-dc-ink/15">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 font-heading text-2xl text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="shrink-0 text-2xl text-dc-clay transition-transform group-open:rotate-45 motion-reduce:transition-none">
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-dc-ink/80">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="rounded-lg border border-dc-ink/10 bg-dc-white p-6">
            <h2 className="font-heading text-3xl text-dc-ink">Masih butuh bantuan?</h2>
            <p className="mt-3 leading-relaxed text-dc-ink/80">
              Kalau kamu sudah punya akun client, chat dengan wedding consultant dari dashboard. Untuk pertanyaan akun
              dan sengketa, hubungi dukungan DuaCincin lewat jalur di bawah.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/client/consultation"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-dc-ink px-5 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
              >
                Chat dengan wedding consultant
              </Link>
            </div>
            {/* TODO(konten): alamat email dukungan resmi belum ditetapkan pemilik produk (PRD §10.6). */}
            <p className="mt-5 rounded-md bg-dc-cream px-3 py-2 text-sm text-dc-ink">
              Email dukungan resmi: segera hadir.
            </p>
          </div>
          <p className="mt-6 text-sm text-dc-ink/80">
            Baca juga{" "}
            <Link href="/legal/client-tos" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
              Ketentuan Layanan Client
            </Link>{" "}
            dan{" "}
            <Link href="/cara-kerja" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
              cara kerja pemesanan
            </Link>
            .
          </p>
        </aside>
      </section>
    </PublicShell>
  );
}
