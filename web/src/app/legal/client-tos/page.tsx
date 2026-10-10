import { LegalPage } from "@/components/landing/LegalPage";

export default function ClientTosPage() {
  return (
    <LegalPage title="Ketentuan Layanan Client">
<ul className="flex flex-col gap-5 leading-relaxed text-dc-ink/85 [&>li]:border-t [&>li]:border-dc-ink/10 [&>li]:pt-5">
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
    </LegalPage>
  );
}
