"use client";

import { ADM_SPLIT, AdmConvPane, AdmPickPane } from "@/components/admin/admPanes";
import { AdmHead } from "@/components/admin/admUi";
import { ADMIN_NAV, CONSULTANT_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";

export default function ConsultationsInboxPage() {
  return (
    <WithUser allowedRoles={["wedding_consultant", "admin"]} loginPath="/login">
      {(user) => <ConsultationsInboxContent user={user} />}
    </WithUser>
  );
}

const STEPS = [
  { t: "Client memulai dari halaman Konsultasi", d: "Percakapan baru muncul di daftar ini begitu mereka menekan tombol chat." },
  { t: "Jadwal resmi diatur oleh client", d: "Usulkan waktu lewat chat. Client lalu menyimpan sesi beserta tautannya di halaman Konsultasi miliknya." },
  { t: "Transaksi tetap di DuaCincin", d: "Arahkan pembayaran vendor lewat booking agar dana terlindungi Dana Aman." },
];

function ConsultationsInboxContent({ user }: { user: CurrentUser }) {
  const isAdmin = user.role === "admin";
  return (
    <AdminShell tone="wd" user={user} navItems={isAdmin ? ADMIN_NAV : CONSULTANT_NAV} loginPath="/login" eyebrow={isAdmin ? "Admin" : "Konsultan"}>
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHead
          kicker="Wedding consultant"
          title={
            <>
              Inbox <em>konsultasi</em>
            </>
          }
          note="Calon pengantin yang meminta bantuan tim DuaCincin. Buka percakapan untuk membalas dan mengusulkan jadwal pertemuan."
        />
        <div className={`mt-8 ${ADM_SPLIT}`}>
          <AdmConvPane
            userId={user.id}
            basePath="/internal/consultations"
            type="consultation"
            searchPlaceholder="Cari nama calon pengantin"
            emptyText="Belum ada calon pengantin yang memulai konsultasi."
          />
          <AdmPickPane title="Pilih percakapan">Balas calon pengantin dan usulkan jadwal pertemuan dari sini.</AdmPickPane>
        </div>

        <section aria-labelledby="alur-konsultasi" className="mt-10 rounded-[28px] bg-wd-accent-wash p-6 sm:p-8">
          <h2 id="alur-konsultasi" className="wd-title text-[1.4rem] leading-tight">
            Alur <em>konsultasi</em>
          </h2>
          <ol className="mt-4 grid gap-5 text-sm leading-relaxed text-wd-text md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-3">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wd-accent text-xs font-bold text-wd-ink">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold text-wd-ink">{s.t}</span>
                  {s.d}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AdminShell>
  );
}
