// Full-width promo strip for the sister product, DuaCincin Digital Invitation:
// real invitation theme screens (from invitation.duacincin.id, public/invitation)
// on a warm espresso band, one line and one link.
import { PhoneFrame } from "@/components/ui/DeviceFrame";

import { ArrowRight } from "./ui";

const THEMES = [
  { src: "/invitation/gardenparty.webp", name: "Garden Party" },
  { src: "/invitation/java.webp", name: "Jawa" },
  { src: "/invitation/luminousgate.webp", name: "Luminous Gate" },
  { src: "/invitation/sakura.webp", name: "Sakura" },
];

export function PromoInvitation() {
  return (
    <section aria-labelledby="promo-undangan" className="bg-white py-6 sm:py-8">
      <div className="wd-container">
        <a
          href="https://invitation.duacincin.id"
          className="group relative grid items-center gap-6 overflow-hidden rounded-[20px] bg-[radial-gradient(ellipse_at_60%_50%,#4a3a2c_0%,#2b231d_60%,#1f1915_100%)] px-6 py-8 text-white sm:px-10 md:grid-cols-[1fr_auto_1.1fr] md:py-7 lg:px-14"
        >
          <div className="relative">
            <p className="text-sm font-semibold text-[#e3c78c]">DuaCincin Digital Invitation</p>
            <p className="wd-display mt-1 text-[1.7rem] leading-tight !text-white">Pilih tema, data terisi sendiri</p>
          </div>
          <ul className="relative flex justify-center gap-2.5 md:gap-3" aria-label="Contoh tema">
            {THEMES.map((t, i) => (
              <li
                key={t.src}
                className={`w-[64px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:w-[80px] ${
                  i % 2 ? "translate-y-2 group-hover:-translate-y-1" : "-translate-y-1 group-hover:translate-y-1"
                }`}
              >
                <PhoneFrame src={t.src} alt={`Tema ${t.name}`} sizes="80px" immersive screen="dark" surface="dark" />
              </li>
            ))}
          </ul>
          <div className="relative">
            <h2 id="promo-undangan" className="text-[1.35rem] font-semibold leading-snug sm:text-[1.55rem]">
              Buat Digital Invitation dari rencana pernikahanmu
            </h2>
            <span className="mt-3 inline-flex items-center gap-2 text-[0.95rem] font-semibold text-[#e3c78c] underline-offset-4 group-hover:underline">
              Lihat semua tema <ArrowRight size={14} />
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
