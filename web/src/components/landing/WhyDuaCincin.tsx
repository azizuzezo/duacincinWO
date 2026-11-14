// The positioning in one glance: how a wedding usually gets organised
// (directory listings, WhatsApp, direct bank transfers, spreadsheets) next to
// the same jobs inside DuaCincin. Every right-hand claim is product behaviour
// (PRD 8.5, 8.11): escrow, verification, consultant, planner, invitation.
// No competitor is named and no number is shown.
import { Reveal } from "@/components/landing/Reveal";
import { ButtonLink } from "@/components/ui/Button";

const ROWS = [
  { job: "Lihat harga", usual: "Tanya satu per satu lewat DM", dc: "Harga dan paket terbuka sebelum daftar" },
  { job: "Pilih vendor", usual: "Siapa pun bisa pasang iklan", dc: "Vendor diverifikasi tim DuaCincin" },
  { job: "Ngobrol dan booking", usual: "Pindah ke WhatsApp, kesepakatan tercecer", dc: "Chat, paket, dan booking tersimpan di satu tempat" },
  { job: "Bayar", usual: "Transfer langsung ke rekening vendor", dc: "Dana ditahan escrow sampai acaramu selesai" },
  { job: "Kalau bingung", usual: "Cari tahu sendiri", dc: "Wedding consultant siap bantu lewat chat" },
  { job: "Rencana dan undangan", usual: "Spreadsheet dan aplikasi terpisah", dc: "Budget, tamu, denah meja, dan undangan digital terhubung" },
];

function Cross() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-dc-text-3/70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}
function Check() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0" fill="none">
      <circle cx="10" cy="10" r="9" fill="#dcbb76" />
      <path d="M6 10.4l2.6 2.6L14.2 7.4" stroke="#15110d" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WhyDuaCincin() {
  return (
    <section aria-labelledby="beda-judul" className="bg-dc-ivory">
      <div className="dc-container py-20 sm:py-28 lg:py-32">
        <Reveal className="max-w-3xl">
          <p className="dc-eyebrow">Kenapa DuaCincin</p>
          <h2 id="beda-judul" className="mt-4 font-heading text-[clamp(2.5rem,5.4vw,4.6rem)] leading-[1] text-dc-ink [text-wrap:balance]">
            Bukan cuma cari vendor. DuaCincin <span className="dc-em">menemani sampai hari-H.</span>
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-dc-text-2">
            Dari cari vendor, ngobrol, bayar, sampai acara selesai, semuanya di satu tempat. Ini bedanya dengan cara yang biasa dipakai calon pengantin.
          </p>
        </Reveal>

        <Reveal className="mt-12 sm:mt-16">
          <div className="grid overflow-hidden rounded-2xl border border-dc-line shadow-lift lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {/* The usual way */}
            <div className="bg-dc-cream p-6 sm:p-10">
              <p className="text-sm font-semibold text-dc-text-3">Cara biasa</p>
              <ul className="dc-stagger mt-6 divide-y divide-dc-line-strong/60">
                {ROWS.map((r) => (
                  <li key={r.job} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <Cross />
                    <div>
                      <p className="text-xs font-semibold text-dc-text-3">{r.job}</p>
                      <p className="mt-0.5 text-dc-text-2">{r.usual}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* DuaCincin */}
            <div className="dc-on-dark relative overflow-hidden bg-dc-ink p-6 text-dc-on-dark sm:p-10">
              <svg aria-hidden viewBox="0 0 200 120" className="pointer-events-none absolute -right-16 -top-10 w-[360px] text-dc-gold-antique/15" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="75" cy="60" r="52" />
                <circle cx="125" cy="60" r="52" />
              </svg>
              <p className="relative text-sm font-semibold text-dc-gold-antique">Lewat DuaCincin</p>
              <ul className="dc-stagger relative mt-6 divide-y divide-dc-ink-3">
                {ROWS.map((r) => (
                  <li key={r.job} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <Check />
                    <div>
                      <p className="text-xs font-semibold text-dc-on-dark/70">{r.job}</p>
                      <p className="mt-0.5 font-semibold text-dc-on-dark">{r.dc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/vendors" variant="primary">
            Cari vendor
          </ButtonLink>
          <ButtonLink href="/cara-kerja" variant="ghost">
            Lihat cara kerja escrow
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
