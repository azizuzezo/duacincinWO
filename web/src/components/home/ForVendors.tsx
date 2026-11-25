// Vendor recruitment: the one dark block on the page (ink), split with the
// real vendor dashboard screen. Steps match the onboarding: sign up, team
// verification, bookings through chat with payout after the event.
import Image from "next/image";

import { Reveal } from "@/components/landing/Reveal";
import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { WdLink } from "./ui";

const STEPS = ["Daftar dan unggah portofolio", "Tim DuaCincin memverifikasi akunmu", "Terima booking, dana cair setelah acara selesai"];

export function ForVendors() {
  return (
    <section aria-labelledby="mitra-judul" className="bg-white py-6 sm:py-10">
      <div className="wd-container">
        <Reveal className="grid overflow-hidden rounded-[32px] bg-wd-ink text-white lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="wd-kicker !text-[#e3c78c]">Untuk vendor</p>
            <h2 id="mitra-judul" className="wd-display mt-4 text-[clamp(2.1rem,4vw,3.2rem)] leading-[1.08] !text-white">
              Punya usaha pernikahan? <em className="!text-[#e3c78c]">Terima booking di sini.</em>
            </h2>
            <ol className="mt-8 border-t border-white/15">
              {STEPS.map((s) => (
                <li key={s} className="border-b border-white/15 py-3.5 text-[0.98rem] leading-relaxed text-white/85">
                  {s}
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
          <div className="relative min-h-[380px] overflow-hidden">
            <Image src="/photos/pinterest/pendopo-kursi-tamu.webp" alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover opacity-70" />
            <div className="absolute inset-0 bg-linear-to-r from-wd-ink/60 to-transparent" aria-hidden />
            <div className="absolute bottom-0 left-1/2 w-[200px] -translate-x-1/2 translate-y-[18%] sm:w-[230px]">
              <PhoneFrame src="/showcase/vendordash-phone.webp" alt="Dashboard vendor di ponsel: permintaan baru dan acara terdekat" sizes="230px" surface="dark" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
