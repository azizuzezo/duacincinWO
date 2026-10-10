import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/landing/Reveal";
import { VENDOR_CATEGORIES } from "@/lib/api";

export function VendorRecruit() {
  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
      <div className="relative order-2 mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-lg bg-dc-ink lg:order-1 lg:col-span-4 lg:max-w-none">
        <Image
          src="/stock/photographer.webp"
          alt="Fotografer pernikahan memotret pasangan lewat kamera"
          fill
          sizes="(min-width: 1024px) 380px, 320px"
          className="object-cover"
        />
      </div>
      <Reveal className="order-1 lg:order-2 lg:col-span-8">
        <h2 className="font-heading text-4xl leading-[1.05] text-dc-ink sm:text-6xl">
          Punya usaha pernikahan? <span className="dc-em">Tampilkan karyamu</span> ke calon client.
        </h2>
        <p className="mt-5 max-w-xl leading-relaxed text-dc-ink/80">
          Daftarkan profil dan portofolio, terima booking lewat chat, dan terima pembayaran dari escrow setelah acara
          selesai dikonfirmasi. Kategori yang tersedia:
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {VENDOR_CATEGORIES.map((c) => (
            <li key={c.value} className="rounded-md border border-dc-ink/20 px-3 py-1.5 text-sm text-dc-ink">
              {c.label}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register?role=vendor"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-dc-ink px-6 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
          >
            Daftar sebagai vendor
          </Link>
          <Link
            href="/legal/vendor-agreement"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-dc-ink/25 px-6 text-sm font-semibold text-dc-ink hover:border-dc-ink hover:bg-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-ink"
          >
            Baca perjanjian kemitraan
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
