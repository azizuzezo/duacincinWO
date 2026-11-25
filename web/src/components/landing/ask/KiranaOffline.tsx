import Link from "next/link";

import { wdButton } from "@/components/home/ui";
import { BrandLogo } from "@/components/ui/BrandLogo";

/** /kirana while the assistant is switched off or not configured: say so
 * kindly and hand over to a Wedding Consultant (free), the vendor
 * directory as the second way forward. Same compact bar as the chat page. */
export function KiranaOffline() {
  return (
    <div data-wd-public className="wd flex min-h-[100dvh] flex-col bg-wd-paper">
      <header className="border-b border-wd-line bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex min-h-11 items-center rounded-md">
            <BrandLogo size={23} priority />
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-wd-text transition-colors hover:bg-wd-blush hover:text-wd-ink">
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Beranda
          </Link>
        </div>
      </header>
      <main id="konten" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-xl rounded-[28px] border border-wd-line bg-white px-6 py-10 text-center shadow-wd-card sm:px-12 sm:py-12">
          <div className="mx-auto flex h-[200px] w-[200px] items-end justify-center rounded-full bg-[radial-gradient(closest-side,var(--wd-accent-soft),transparent)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- small local still */}
            <img src="/kirana/kirana-idle.webp" alt="Kirana, asisten AI DuaCincin" className="dc-kirana-float h-[190px] w-auto" />
          </div>
          <p className="wd-kicker mt-5">Asisten AI DuaCincin</p>
          <h1 className="wd-display mt-1 text-[clamp(2rem,5vw,2.6rem)] leading-[1.08]">
            Kirana sedang <em>istirahat sebentar.</em>
          </h1>
          <p className="mx-auto mt-3 max-w-[44ch] leading-relaxed text-wd-text">
            Tapi kamu tetap bisa dibantu: Wedding Consultant DuaCincin (orang sungguhan) siap menemani rencana pernikahanmu, gratis.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href="/client/consultation?chat=1" className={wdButton()}>
              Chat Wedding Consultant
            </Link>
            <Link href="/vendors" className={wdButton({ variant: "outline" })}>
              Lihat vendor
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
