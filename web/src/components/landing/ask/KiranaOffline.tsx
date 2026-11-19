import Link from "next/link";

import { BrandLogo } from "@/components/ui/BrandLogo";

/** /kirana while the assistant is switched off or not configured: say so
 * kindly and hand over to a Wedding Consultant (free), the vendor
 * directory as the second way forward. */
export function KiranaOffline() {
  return (
    <main id="konten" className="relative isolate flex min-h-[100dvh] flex-col bg-dc-ivory">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-[#f3d2b8]/60 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-[460px] w-[460px] rounded-full bg-[#e8cb8c]/45 blur-3xl" />
      </div>
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center" aria-label="Kembali ke beranda DuaCincin">
          <BrandLogo size={30} />
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- small local still */}
        <img src="/kirana/kirana-idle.webp" alt="Kirana, asisten AI DuaCincin" className="dc-kirana-float h-[220px] w-auto" />
        <h1 className="mt-4 font-heading text-[2.2rem] font-semibold leading-tight text-dc-ink">
          Kirana sedang <span className="dc-em">istirahat sebentar.</span>
        </h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-dc-text-2">
          Tapi kamu tetap bisa dibantu: Wedding Consultant DuaCincin (orang sungguhan) siap menemani rencana pernikahanmu, gratis.
        </p>
        <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <Link
            href="/client/consultation?chat=1"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-linear-135 from-dc-gold-antique to-dc-gold px-7 font-semibold text-dc-ink shadow-soft transition-[transform,box-shadow] duration-300 ease-dc hover:shadow-gold motion-safe:hover:-translate-y-0.5"
          >
            Chat Wedding Consultant
          </Link>
          <Link href="/vendors" className="inline-flex min-h-12 items-center justify-center rounded-full border border-dc-line-strong px-7 font-semibold text-dc-ink hover:border-dc-ink">
            Lihat vendor
          </Link>
        </div>
      </div>
    </main>
  );
}
