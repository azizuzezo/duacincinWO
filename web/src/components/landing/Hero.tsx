import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-dc-navy">
      {/* Brand ring motif — subtle, slow-spinning, thematically tied to
          "DuaCincin" (two rings) rather than a generic decorative blob. */}
      <svg
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] animate-spin-slow opacity-[0.08] sm:h-[560px] sm:w-[560px]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="80" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
        <circle cx="130" cy="100" r="55" stroke="#F5A623" strokeWidth="3" />
      </svg>

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-dc-gold/15 px-4 py-1 text-xs font-semibold tracking-wide text-dc-gold uppercase">
            Marketplace Wedding Organizer Terpercaya
          </span>
          <h1 className="font-heading mt-5 text-4xl font-extrabold leading-tight text-dc-white sm:text-5xl">
            Rencanakan Pernikahan Impian,
            <br />
            Tanpa Drama Vendor.
          </h1>
          <p className="mt-5 text-lg text-dc-white/70">
            DuaCincin menghubungkanmu dengan vendor pernikahan terverifikasi di seluruh Indonesia — cari, chat,
            booking, dan bayar, semua aman dalam satu platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/client/register"
              className="rounded-full bg-dc-gold px-7 py-3 text-sm font-bold text-dc-navy shadow-lg shadow-dc-gold/20 transition hover:scale-105 hover:bg-dc-white"
            >
              Mulai Cari Vendor — Gratis
            </Link>
            <Link
              href="/vendor/register"
              className="rounded-full border border-dc-white/20 px-7 py-3 text-sm font-semibold text-dc-white transition hover:bg-dc-white/10"
            >
              Daftar Jadi Mitra Vendor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
