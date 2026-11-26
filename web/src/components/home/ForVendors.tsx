// Vendor recruitment: the one dark block on the page (ink). A scalloped
// "shop awning" in gold and cream hangs from its top edge (the vendor's
// storefront). Left: the pitch and the three onboarding steps as a plain
// numbered list with hairlines (no boxes). Right: a wedding photo with the
// real vendor dashboard on a phone, nothing floating around it. Steps match
// the onboarding: sign up, team verification, bookings through chat with
// payout after the event.
import Image from "next/image";

import { Reveal } from "@/components/landing/Reveal";
import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { WdLink } from "./ui";

const STEPS = ["Daftar dan unggah portofolio", "Tim DuaCincin memverifikasi akunmu", "Terima booking, dana cair setelah acara selesai"];

export function ForVendors() {
  return (
    <section aria-labelledby="mitra-judul" className="bg-white py-6 sm:py-10">
      <div className="wd-container">
        <Reveal className="relative isolate grid overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_85%_30%,#3a2f27_0%,#231f1d_55%,#1b1815_100%)] text-white lg:grid-cols-2">
          {/* The shop awning: gold and cream scallops hanging from the top edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-7"
            style={{
              backgroundImage: "radial-gradient(circle at 24px 0, #dcbd80 23px, transparent 24px), radial-gradient(circle at 72px 0, #f5ecd9 23px, transparent 24px)",
              backgroundSize: "96px 28px",
              backgroundRepeat: "repeat-x",
            }}
          />

          <div className="p-8 pt-14 sm:p-12 sm:pt-16 lg:p-16 lg:pt-20">
            <p className="wd-kicker !text-[#e3c78c]">Untuk vendor</p>
            <h2 id="mitra-judul" className="wd-display mt-4 text-[clamp(2.1rem,4vw,3.2rem)] leading-[1.08] !text-white">
              Punya usaha pernikahan? <em className="!text-[#e3c78c]">Terima booking di sini.</em>
            </h2>
            <ol className="mt-9 border-t border-white/15">
              {STEPS.map((text, i) => (
                <li key={text} className="flex items-baseline gap-5 border-b border-white/15 py-4">
                  <span className="wd-display w-6 shrink-0 text-[1.7rem] italic leading-none !text-[#e3c78c]">{i + 1}</span>
                  <span className="text-[1.02rem] leading-snug text-white/90">{text}</span>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
              <WdLink href="/register?role=vendor" variant="white">
                Daftar sebagai vendor
              </WdLink>
              <WdLink href="/untuk-vendor" variant="ink" className="border border-white/30 hover:border-white">
                Lihat syarat dan komisi
              </WdLink>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden pt-7">
            <Image src="/photos/pinterest/pendopo-kursi-tamu.webp" alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover opacity-60" />
            <div className="absolute inset-0 bg-linear-to-r from-[#231f1d]/70 to-transparent" aria-hidden />
            <div className="absolute bottom-0 left-1/2 w-[200px] -translate-x-1/2 translate-y-[16%] sm:w-[230px]">
              <PhoneFrame src="/showcase/vendordash-phone.webp" alt="Dashboard vendor di ponsel: permintaan baru dan acara terdekat" sizes="230px" surface="dark" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
