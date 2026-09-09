import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Image
        src="/brand/duacincin-logo.webp"
        alt="Logo DuaCincin"
        width={120}
        height={120}
        priority
      />
      <h1 className="font-heading text-3xl font-extrabold text-dc-navy sm:text-4xl">
        DuaCincin
      </h1>
      <p className="max-w-md text-dc-black/70">
        Fase 1 (Autentikasi) selesai — daftar/masuk Client & Vendor, lupa
        password via OTP, dan rate limiting sudah berfungsi. Landing page
        penuh menyusul di Fase 2.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
        <Link href="/client/register" className="rounded-xl bg-dc-navy px-5 py-2.5 text-dc-white hover:bg-dc-gold hover:text-dc-navy">
          Daftar sebagai Client
        </Link>
        <Link href="/vendor/register" className="rounded-xl border border-dc-navy/20 px-5 py-2.5 text-dc-navy hover:bg-dc-offwhite">
          Daftar Jadi Mitra Vendor
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-dc-black/60">
        <Link href="/client/login" className="hover:text-dc-navy">Masuk Client</Link>
        <Link href="/vendor/login" className="hover:text-dc-navy">Masuk Vendor</Link>
        <Link href="/internal/login" className="hover:text-dc-navy">Login Internal</Link>
      </div>
    </main>
  );
}
