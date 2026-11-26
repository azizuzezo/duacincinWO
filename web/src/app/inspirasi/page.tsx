import Link from "next/link";

import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { InspirationGallery } from "@/components/public/inspirasi/Gallery";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

// Compact header, then the gallery. Data, filters and the lightbox live in
// the client gallery; the page itself stays a server shell.
export default function InspirationGalleryPage() {
  return (
    <PublicShell>
      <div className="wd">
        <PageHero
          image="/banner/foto-inspirasi.webp"
          crumbs={[{ name: "Inspirasi" }]}
          title="Inspirasi pernikahan"
          sub={
            <>
              Kurasi dari{" "}
              <a href={PINTEREST_BOARD_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
                papan Pinterest DuaCincin
              </a>
              . Ketuk foto untuk melihat vendornya.
            </>
          }
        />
        <InspirationGallery />

        <section aria-labelledby="cara-pakai" className="border-t border-wd-line bg-wd-paper">
          <div className="wd-container grid gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-14">
            <div>
              <h2 id="cara-pakai" className="wd-title text-[1.4rem] leading-tight">
                Cara memakai galeri inspirasi
              </h2>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-wd-text">
                Galeri ini dikurasi dari papan Pinterest DuaCincin: dekorasi pelaminan, venue, rias pengantin, dan busana adat dari berbagai daerah. Pakai untuk menyamakan selera dengan pasangan sebelum bicara dengan vendor.
              </p>
            </div>
            <ol className="flex flex-col gap-5">
              {[
                ["Kumpulkan favoritmu", "Pilih lima sampai sepuluh foto yang paling terasa seperti kalian. Jangan terlalu cepat memilih, biarkan polanya muncul sendiri."],
                ["Cari polanya", "Lihat warna, jenis bunga, pencahayaan, dan suasana yang berulang. Itu bahan untuk brief ke vendor."],
                ["Tanya vendornya", "Ketuk foto untuk melihat vendor yang tertaut dengannya, lalu kirim foto referensi lewat chat dan tanyakan apa yang bisa dibuat sesuai anggaranmu."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span aria-hidden className="wd-display w-6 shrink-0 text-[1.5rem] italic leading-none text-wd-accent-ink">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-wd-ink">{title}</span>
                    <span className="mt-1 block text-[0.93rem] leading-relaxed text-wd-text">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="wd-container pb-12">
            <p className="text-sm font-semibold text-wd-ink">Lanjut dari inspirasi ke vendor</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[
                ["/kategori/decor", "Dekorasi"],
                ["/kategori/venue", "Venue"],
                ["/kategori/mua_attire", "MUA dan busana"],
                ["/kategori/photo_video", "Foto dan video"],
                ["/artikel/cara-memilih-venue-pernikahan", "Cara memilih venue"],
                ["/artikel/ragam-adat-pernikahan-indonesia", "Ragam adat pernikahan"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-11 items-center rounded-full border border-wd-accent-line bg-white px-4 text-sm font-semibold text-wd-ink transition-colors hover:border-wd-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
