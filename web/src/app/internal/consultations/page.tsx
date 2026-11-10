"use client";

import { ConversationList } from "@/components/ConversationList";
import { ADMIN_NAV, CONSULTANT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";
import { PAGE } from "../_ui";

export default function ConsultationsInboxPage() {
  return (
    <WithUser allowedRoles={["wedding_consultant", "admin"]} loginPath="/login">
      {(user) => <ConsultationsInboxContent user={user} />}
    </WithUser>
  );
}

function ConsultationsInboxContent({ user }: { user: CurrentUser }) {
  const isAdmin = user.role === "admin";
  return (
    <Shell user={user} navItems={isAdmin ? ADMIN_NAV : CONSULTANT_NAV} loginPath="/login" eyebrow={isAdmin ? "Admin" : "Konsultan"}>
      <div className={PAGE}>
        <PageHeader
          eyebrow="Wedding consultant"
          title={
            <>
              Inbox <span className="dc-em">konsultasi</span>
            </>
          }
          subtitle="Calon pengantin yang meminta bantuan tim DuaCincin. Buka percakapan untuk membalas dan mengusulkan jadwal pertemuan."
        />

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-label="Daftar percakapan">
            <ConversationList basePath="/internal/consultations" emptyLabel="Belum ada calon pengantin yang memulai konsultasi." currentUserId={user.id} />
          </section>

          {/* Working notes for the consultant: what the couple sees on their side, so replies match it. */}
          <aside aria-labelledby="cara-kerja" className="rounded-xl bg-dc-cream p-5 sm:p-6">
            <h2 id="cara-kerja" className="font-heading text-2xl text-dc-ink">
              Alur konsultasi
            </h2>
            <ul className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-dc-text-2">
              <li>
                <span className="block font-semibold text-dc-ink">Client memulai dari halaman Konsultasi</span>
                Percakapan baru muncul di daftar ini begitu mereka menekan tombol chat.
              </li>
              <li>
                <span className="block font-semibold text-dc-ink">Jadwal resmi diatur oleh client</span>
                Usulkan waktu lewat chat. Client lalu menyimpan sesi beserta tautannya di halaman Konsultasi miliknya.
              </li>
              <li>
                <span className="block font-semibold text-dc-ink">Transaksi tetap di DuaCincin</span>
                Arahkan pembayaran vendor lewat booking agar dana terlindungi escrow.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
