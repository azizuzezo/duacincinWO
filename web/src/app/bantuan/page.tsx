import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { HelpCenter, type Faq, type Topic } from "@/components/public/bantuan/HelpCenter";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Bantuan dan pertanyaan umum",
  description: "Jawaban atas pertanyaan yang sering muncul soal escrow, booking, sengketa, dan akun vendor di DuaCincin.",
};

// Official DuaCincin WO support channels (PRD §10.6). Leave empty until the
// owner confirms an address or number for WO; the card then shows them.
// TODO(konten): isi saat pemilik produk menetapkan kontak dukungan resmi WO.
const SUPPORT_CHANNELS: { label: string; value: string; href: string }[] = [];

const faq = (q: string, text: string, a?: React.ReactNode): Faq => ({ q, text, a: a ?? text });

// Every answer mirrors what the product does (PRD §8.5, §8.11, booking and
// payment code). No generic SaaS questions.
const TOPICS: Topic[] = [
  {
    key: "pembayaran",
    label: "Pembayaran dan escrow",
    items: [
      faq(
        "Kapan uangku sampai ke vendor?",
        "Hanya setelah kamu mengonfirmasi acara selesai. Sebelum itu, DP dan pelunasan ditahan di akun penampung DuaCincin. Setelah dikonfirmasi, dana diteruskan ke vendor dikurangi komisi platform.",
        <>
          Hanya setelah kamu mengonfirmasi acara selesai. Sebelum itu, DP dan pelunasan ditahan di akun penampung DuaCincin. Setelah dikonfirmasi, dana diteruskan ke vendor dikurangi komisi platform.{" "}
          <Link href="/cara-kerja">Lihat ketujuh tahapnya</Link>.
        </>,
      ),
      faq(
        "Berapa DP yang harus dibayar?",
        "DP 30% dari harga yang kamu sepakati dengan vendor, dibayar lewat Midtrans setelah vendor mengonfirmasi booking. Sisanya kamu lunasi sebelum technical meeting. Keduanya ditahan escrow sampai acara selesai.",
      ),
      faq(
        "Boleh bayar langsung ke rekening vendor?",
        "Tidak disarankan. Pembayaran di luar DuaCincin tidak dilindungi escrow dan tidak tercatat kalau terjadi sengketa. Vendor juga terikat perjanjian yang melarang transaksi di luar platform.",
      ),
    ],
  },
  {
    key: "booking",
    label: "Vendor dan booking",
    items: [
      faq(
        "Apakah harus masuk untuk melihat vendor?",
        "Tidak. Profil dan portofolio vendor terbuka untuk siapa saja. Akun baru dibutuhkan saat kamu mau chat dengan vendor atau mengajukan booking.",
      ),
      faq(
        "Kenapa nomor telepon vendor tidak ditampilkan?",
        "Komunikasi berlangsung lewat chat DuaCincin supaya semua kesepakatan harga, tanggal, dan paket tercatat. Nomor, email, dan tautan luar yang dibagikan di chat ditandai untuk ditinjau Admin, tapi pesannya tetap terkirim.",
      ),
      faq(
        "Bagaimana kalau terjadi sengketa dengan vendor?",
        "Riwayat chat dan booking menjadi rujukan. Kamu bisa melaporkannya, lalu Admin menengahi lewat antrean sengketa. Ketentuan lengkapnya ada di Ketentuan Layanan Client.",
        <>
          Riwayat chat dan booking menjadi rujukan. Kamu bisa melaporkannya, lalu Admin menengahi lewat antrean sengketa. Ketentuan lengkapnya ada di{" "}
          <Link href="/legal/client-tos">Ketentuan Layanan Client</Link>.
        </>,
      ),
    ],
  },
  {
    key: "konsultan",
    label: "Konsultan dan perencanaan",
    items: [
      faq(
        "Apa itu wedding consultant, dan apakah wajib?",
        "Konsultan adalah staf DuaCincin yang membantu memilih vendor lewat chat, dan bisa mendampingi lewat sesi meeting. Ini opsional: kamu boleh mencari dan menghubungi vendor sendiri.",
      ),
      faq(
        "Apa saja yang ada di wedding planner?",
        "Setelah membuat akun client, kamu mendapat daftar persiapan, daftar tamu dengan tautan RSVP, rundown acara, denah meja, dan perencana anggaran. Semuanya tersimpan di akunmu.",
      ),
    ],
  },
  {
    key: "vendor",
    label: "Untuk vendor",
    items: [
      faq(
        "Bagaimana usaha saya bisa tampil di direktori?",
        "Daftar sebagai vendor dan setujui Perjanjian Kemitraan, lalu lengkapi profil, portofolio, dan paket. Profilmu muncul di direktori setelah Admin menyetujuinya.",
        <>
          Daftar sebagai vendor dan setujui Perjanjian Kemitraan, lalu lengkapi profil, portofolio, dan paket. Profilmu muncul di direktori setelah Admin menyetujuinya.{" "}
          <Link href="/untuk-vendor">Lihat cara bergabung</Link>.
        </>,
      ),
      faq(
        "Berapa komisi DuaCincin?",
        "Komisi standar 10% dari setiap transaksi yang berhasil, dipotong saat dana diteruskan ke vendor. Admin bisa mengatur tarif yang berbeda untuk vendor tertentu.",
      ),
      faq(
        "Kapan dana dicairkan ke vendor?",
        "Setelah client mengonfirmasi acaranya selesai. Dana DP dan pelunasan yang ditahan escrow diteruskan ke vendor dikurangi komisi, dan tercatat di halaman Pencairan.",
      ),
    ],
  },
];

export default function BantuanPage() {
  return (
    <PublicShell>
      <PageHero
        image="/stock/ballroom.webp"
        eyebrow="Pusat bantuan"
        title={
          <>
            Ada yang <span className="dc-em-light">belum jelas?</span>
          </>
        }
        subtitle="Cari jawabannya di sini, soal pembayaran, booking, perencanaan, dan akun vendor."
      />

      <section className="bg-dc-ivory">
        <div className="dc-container grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-16 lg:py-20">
          <div className="min-w-0 lg:col-span-8">
            <HelpCenter topics={TOPICS} />
          </div>

          <aside aria-labelledby="bantuan-lanjut" className="min-w-0 lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <div className="dc-on-dark relative overflow-hidden rounded-2xl bg-dc-ink p-6 text-dc-on-dark shadow-lift sm:p-7">
                <p className="dc-eyebrow">Masih butuh bantuan?</p>
                <h2 id="bantuan-lanjut" className="mt-4 font-heading text-[2rem] leading-[1.08] text-dc-on-dark">
                  Tanya langsung ke <span className="dc-em-light">wedding consultant.</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-dc-on-dark/80">
                  Konsultan DuaCincin menjawab lewat chat di akun client-mu, misalnya soal memilih vendor, anggaran, dan langkah booking.
                </p>
                <ButtonLink href="/client/consultation" variant="gold" size="md" block className="mt-6">
                  Chat dengan wedding consultant
                </ButtonLink>
                <p className="mt-3 text-xs leading-relaxed text-dc-on-dark/75">
                  Belum punya akun?{" "}
                  <Link href="/register" className="font-semibold text-dc-gold-antique underline underline-offset-4">
                    Buat akun client
                  </Link>{" "}
                  dulu, lalu buka menu Konsultasi.
                </p>
                {SUPPORT_CHANNELS.length > 0 && (
                  <ul className="mt-6 border-t border-dc-ink-3 pt-5">
                    {SUPPORT_CHANNELS.map((c) => (
                      <li key={c.href}>
                        <a href={c.href} className="flex min-h-11 flex-col justify-center text-sm hover:text-dc-gold-antique">
                          <span className="text-xs text-dc-on-dark/70">{c.label}</span>
                          <span className="font-semibold">{c.value}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4 rounded-2xl border border-dc-line bg-dc-white p-6">
                <h3 className="font-heading text-2xl text-dc-ink">Kamu vendor?</h3>
                <p className="mt-2 text-sm leading-relaxed text-dc-text-2">
                  Pertanyaan soal booking dan pencairan ada di dashboard vendor. Untuk aturan kerja sama, baca perjanjiannya.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href="/vendor/dashboard" variant="ghost" size="sm">
                    Buka dashboard vendor
                  </ButtonLink>
                  <ButtonLink href="/legal/vendor-agreement" variant="quiet" size="sm">
                    Perjanjian kemitraan
                  </ButtonLink>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}
