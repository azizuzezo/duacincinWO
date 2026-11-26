// One slim strip between the shelf and the categories: how booking works in
// four short steps, as on a marketplace's "how to buy" line. The long
// illustrated version lives lower on the page.
import Link from "next/link";

const STEPS = ["Cari dan bandingkan vendor", "Chat dan ajukan booking", "Bayar DP lewat Dana Aman", "Dana cair setelah acara selesai"];

export function HowStrip() {
  return (
    <section aria-label="Cara booking" className="bg-white pb-4">
      <div className="wd-container">
        <div className="flex flex-col gap-4 rounded-[22px] bg-wd-accent-wash px-5 py-4 ring-1 ring-wd-line lg:flex-row lg:items-center lg:gap-8 lg:px-7">
          <p className="shrink-0 text-[0.95rem] font-semibold text-wd-ink">Cara booking</p>
          <ol className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[0.88rem] leading-snug text-wd-text">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wd-accent text-[0.8rem] font-semibold text-wd-ink">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <Link href="/cara-kerja" className="shrink-0 text-[0.9rem] font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
            Cara kerja Dana Aman
          </Link>
        </div>
      </div>
    </section>
  );
}
