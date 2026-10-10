import Image from "next/image";
import Link from "next/link";

import { VENDOR_CATEGORIES } from "@/lib/api";

const FIELD =
  "min-h-12 w-full rounded-md border border-dc-ink/15 bg-dc-white px-3.5 text-sm text-dc-ink placeholder:text-dc-ink/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dc-ink";

/** Cinematic hero: full-bleed photo (placeholder stock, see public/stock/README.md),
 * headline on the photo, and the search bar as the single focal point. The
 * bottom scrim exists only so white text clears WCAG AA over the bright
 * parts of the image. The search is a native GET to /vendors, so it works
 * without JS. No entrance animation: the first paint is the hero. */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-dc-ink">
      <Image
        src="/stock/hero-reception.webp"
        alt="Meja resepsi pernikahan dengan rangkaian bunga merah dan lampu gantung"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-dc-ink via-dc-ink/55 to-dc-ink/35" aria-hidden />

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-32 sm:px-6 lg:px-10 lg:pb-16">
        <h1 className="max-w-4xl font-heading text-[clamp(2.6rem,7.2vw,6.5rem)] font-medium leading-[0.98] text-dc-white">
          Pernikahan yang rapi, <span className="dc-em-light">dari pilih vendor sampai hari-H.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-dc-white/85">
          Bandingkan vendor terverifikasi, diskusi dan booking di satu tempat, dan bayar lewat escrow yang baru
          diteruskan ke vendor setelah acaramu selesai.
        </p>

        <form
          action="/vendors"
          method="get"
          className="mt-9 grid max-w-3xl gap-3 rounded-lg bg-dc-ivory p-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label htmlFor="hero-category" className="sr-only">
              Kategori vendor
            </label>
            <select id="hero-category" name="category" defaultValue="" className={FIELD}>
              <option value="">Semua kategori</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hero-q" className="sr-only">
              Nama vendor atau kota
            </label>
            <input id="hero-q" name="q" type="search" placeholder="Kota atau nama vendor" className={FIELD} />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-dc-clay px-7 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
          >
            Cari vendor
          </button>
        </form>
        <p className="mt-4 text-sm text-dc-white/80">
          Belum tahu mulai dari mana?{" "}
          <Link href="/register?role=client" className="font-semibold text-dc-white underline underline-offset-4 hover:text-dc-gold-antique">
            Buat akun dan ngobrol dengan wedding consultant
          </Link>
        </p>
      </div>
    </section>
  );
}
