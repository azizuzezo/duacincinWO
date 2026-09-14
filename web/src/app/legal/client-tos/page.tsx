import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

export default function ClientTosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-dc-offwhite">
      <Navbar />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Ketentuan Layanan Client</h1>
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-dc-gold/20 p-3 text-sm text-dc-navy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M11 2 1 19h20L11 2ZM11 9v4M11 15.5h.01" />
          </svg>
          Draft awal untuk kebutuhan produk, bukan nasihat hukum. Wajib direview advokat sebelum mengikat pengguna nyata.
        </p>
        <ul className="mt-6 flex flex-col gap-4 text-dc-black/80">
          <li>
            Client setuju bahwa seluruh komunikasi dan transaksi dengan Vendor yang ditemukan melalui DuaCincin dilakukan
            lewat Platform, demi perlindungan Client sendiri (bukti transaksi, mediasi sengketa, jaminan dana via escrow).
          </li>
          <li>
            Client tidak diperkenankan secara sengaja mengalihkan transaksi ke luar Platform untuk menghindari biaya
            layanan; pelanggaran berulang dapat berdampak pada pembatasan akses akun.
          </li>
          <li>
            Data pribadi Client dikumpulkan dan digunakan sesuai Kebijakan Privasi DuaCincin (mengacu pada UU Pelindungan
            Data Pribadi).
          </li>
        </ul>
      </main>
      <Footer />
    </div>
  );
}
