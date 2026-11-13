import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/landing/PublicShell";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Informasi perusahaan",
  description: `DuaCincin dikelola ${COMPANY.name}. Nomor pengesahan, NIB, dan NPWP perseroan.`,
  alternates: { canonical: "/perusahaan" },
};

// Paper layout like /kredit and the legal pages (ENERGY 1, MOTION 1): a
// reference page people open to check who runs the site, so nothing moves.
const ROWS = [
  { label: "Nama perseroan", value: COMPANY.name },
  { label: "Nomor sertifikat pendirian", value: COMPANY.deedNumber },
  { label: "Nomor Induk Berusaha (NIB)", value: COMPANY.nib },
  { label: "NPWP perseroan", value: COMPANY.npwp },
];

export default function PerusahaanPage() {
  return (
    <PublicShell overlay={false}>
      <header className="dc-grain border-b border-dc-line bg-dc-cream">
        <div className="dc-container py-12 sm:py-16">
          <p className="dc-eyebrow">Informasi perusahaan</p>
          <h1 className="mt-4 max-w-3xl font-heading text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-dc-ink">
            DuaCincin dikelola <span className="dc-em">{COMPANY.name}</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dc-text-2">
            Situs dan aplikasi DuaCincin dioperasikan oleh {COMPANY.name}, perseroan terbatas yang terdaftar di Indonesia. Data
            legalitasnya ada di bawah.
          </p>
        </div>
      </header>

      <div className="dc-container py-10 sm:py-14">
        <dl className="max-w-3xl rounded-xl border border-dc-line bg-dc-white px-5 sm:px-8">
          {ROWS.map((r) => (
            <div key={r.label} className="grid gap-1 border-t border-dc-line py-5 first:border-t-0 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6">
              <dt className="text-sm text-dc-text-3">{r.label}</dt>
              <dd className="break-words font-semibold text-dc-ink tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-dc-text-2">
          Aturan memakai DuaCincin ada di{" "}
          <Link href="/legal/client-tos" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
            ketentuan layanan client
          </Link>{" "}
          dan{" "}
          <Link href="/legal/vendor-agreement" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
            perjanjian kemitraan vendor
          </Link>
          . Ada pertanyaan?{" "}
          <Link href="/bantuan" className="font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
            Buka pusat bantuan
          </Link>
          .
        </p>
      </div>
    </PublicShell>
  );
}
