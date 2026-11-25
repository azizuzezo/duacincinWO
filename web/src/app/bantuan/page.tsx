import type { Metadata } from "next";
import Link from "next/link";

import { wdButton } from "@/components/home/ui";
import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { FaqList, type Faq, type Topic } from "@/components/public/bantuan/FaqList";
import { SectionNav } from "@/components/public/shared/SectionNav";
import { LIFT } from "@/components/public/shared/styles";
import { JsonLd, webPageLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Bantuan dan pertanyaan umum",
  description: "Jawaban atas pertanyaan yang sering muncul soal escrow, booking, sengketa, dan akun vendor di DuaCincin.",
  alternates: { canonical: "/bantuan" },
};

// Official DuaCincin WO support channels (PRD §10.6). Leave empty until the
// owner confirms an address or number for WO; the card then shows them.
// TODO(konten): isi saat pemilik produk menetapkan kontak dukungan resmi WO.
const SUPPORT_CHANNELS: { label: string; value: string; href: string }[] = [];

// Soft tints of the Putih palette for the topic tiles (text stays ink, 9:1+).
const TILE = ["bg-wd-accent-wash ring-wd-accent-soft", "bg-[#f3f0ea] ring-wd-line", "bg-[#f1f3ee] ring-[#e3e8dc]", "bg-[#f6efec] ring-[#ecdfd9]"];

const LINK = "font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink";

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
        "Hanya setelah kamu mengonfirmasi acara selesai. Sebelum itu, DP dan pelunasan ditahan di akun penampung DuaCincin. Setelah dikonfirmasi, dana diteruskan ke vendor.",
        <>
          Hanya setelah kamu mengonfirmasi acara selesai. Sebelum itu, DP dan pelunasan ditahan di akun penampung DuaCincin. Setelah dikonfirmasi, dana diteruskan ke vendor.{" "}
          <Link href="/cara-kerja">Lihat ketujuh tahapnya</Link>.
        </>,
      ),
      faq(
        "Berapa DP yang harus dibayar?",
        "DP 30% dari harga yang kamu sepakati dengan vendor, dibayar lewat DuaCincin setelah vendor mengonfirmasi booking. Sisanya kamu lunasi sebelum technical meeting. Keduanya ditahan escrow sampai acara selesai.",
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
        "Daftar sebagai vendor dan centang persetujuan Perjanjian Kemitraan, lalu lengkapi profil, portofolio, dan paket. Profilmu muncul di direktori setelah Admin menyetujuinya.",
        <>
          Daftar sebagai vendor dan centang persetujuan Perjanjian Kemitraan, lalu lengkapi profil, portofolio, dan paket. Profilmu muncul di direktori setelah Admin menyetujuinya.{" "}
          <Link href="/untuk-vendor">Lihat cara bergabung</Link>.
        </>,
      ),
      faq(
        "Berapa komisi DuaCincin?",
        "Komisi standar 10%, ditambahkan di atas hargamu pada harga yang dilihat calon pengantin. Kamu menerima harga yang kamu tetapkan secara utuh. Admin bisa mengatur tarif yang berbeda untuk vendor tertentu.",
      ),
      faq(
        "Kapan dana dicairkan ke vendor?",
        "Setelah client mengonfirmasi acaranya selesai. Dana DP dan pelunasan yang ditahan escrow diteruskan ke vendor sebesar harga yang ditetapkan vendor, dan tercatat di halaman Pencairan.",
      ),
    ],
  },
];

export default function BantuanPage() {
  return (
    <PublicShell>
      <JsonLd data={webPageLd("WebPage", "/bantuan", "Bantuan DuaCincin", "Jawaban atas pertanyaan soal escrow, booking, sengketa, dan akun vendor di DuaCincin.")} />
      {/* The questions and answers shown on this page, word for word. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: TOPICS.flatMap((t) => t.items).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
        }}
      />
      <div className="wd">
        <PageHero image="/banner/foto-bantuan.webp" focus="70% 50%" crumbs={[{ name: "Bantuan" }]} title="Pusat bantuan" sub="Jawaban soal pembayaran, booking, perencanaan, dan akun vendor.">
          {/* Quick tiles, one per topic, each tinted so the four read apart at a glance. */}
          <ul aria-label="Topik" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TOPICS.map((t, i) => (
              <li key={t.key}>
                <a href={`#topik-${t.key}`} className={`group flex h-full min-h-28 flex-col justify-between rounded-[18px] p-4 ring-1 ring-inset sm:p-5 ${TILE[i % TILE.length]} ${LIFT}`}>
                  <span className="text-[0.98rem] font-semibold leading-snug text-wd-ink">{t.label}</span>
                  <span className="mt-3 flex items-center justify-between text-sm text-wd-text">
                    {t.items.length} pertanyaan
                    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-y-0.5">
                      <path d="M12 5v14M6 13l6 6 6-6" />
                    </svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </PageHero>
        <SectionNav label="Topik bantuan" items={TOPICS.map((t) => ({ id: `topik-${t.key}`, label: t.label, count: t.items.length }))} />

        <div className="wd-container grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-8">
            <FaqList topics={TOPICS} />
            <p className="mt-10 text-sm text-wd-text">
              Rincian lengkap ada di{" "}
              <Link href="/legal/client-tos" className={LINK}>
                Ketentuan Layanan Client
              </Link>{" "}
              dan{" "}
              <Link href="/legal/vendor-agreement" className={LINK}>
                Perjanjian Kemitraan Vendor
              </Link>
              .
            </p>
          </div>

          <aside aria-labelledby="bantuan-lanjut" className="lg:col-span-4">
            <div className="flex flex-col gap-4 lg:sticky lg:top-[190px]">
              <div className="rounded-[22px] bg-wd-accent-wash p-6 ring-1 ring-wd-accent-soft">
                <h2 id="bantuan-lanjut" className="wd-title text-[1.25rem]">
                  Masih butuh bantuan?
                </h2>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-wd-text">Tanya wedding consultant DuaCincin lewat chat di akun client-mu.</p>
                <Link href="/client/consultation" className={wdButton({ className: "mt-5 w-full" })}>
                  Chat dengan wedding consultant
                </Link>
                <p className="mt-3 text-sm text-wd-muted">
                  Belum punya akun?{" "}
                  <Link href="/register" className={LINK}>
                    Buat akun client
                  </Link>
                </p>
                {SUPPORT_CHANNELS.length > 0 && (
                  <ul className="mt-5 border-t border-wd-accent-soft pt-4">
                    {SUPPORT_CHANNELS.map((c) => (
                      <li key={c.href}>
                        <a href={c.href} className="flex min-h-11 flex-col justify-center text-sm hover:text-wd-accent-ink">
                          <span className="text-xs text-wd-muted">{c.label}</span>
                          <span className="font-semibold text-wd-ink">{c.value}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-[22px] border border-wd-line p-6">
                <h2 className="wd-title text-[1.1rem]">Kamu vendor?</h2>
                <p className="mt-2 text-sm leading-relaxed text-wd-text">Booking dan pencairan ada di dashboard vendor.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/vendor/dashboard" className={wdButton({ variant: "outline", size: "sm" })}>
                    Dashboard vendor
                  </Link>
                  <Link href="/legal/vendor-agreement" className={wdButton({ variant: "outline", size: "sm" })}>
                    Perjanjian kemitraan
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
