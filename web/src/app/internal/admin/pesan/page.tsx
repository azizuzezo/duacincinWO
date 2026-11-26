"use client";

import { ADM_SPLIT, AdmConvPane, AdmPickPane } from "@/components/admin/admPanes";
import { AdmHead } from "@/components/admin/admUi";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { WithUser } from "@/components/WithUser";

/** The vendor chats this admin started (one thread per vendor, per admin). */
export default function AdminVendorMessagesPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => (
        <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
          <div className="wd-container pb-16 pt-8 sm:pt-10">
            <AdmHead
              kicker="Layanan"
              title={
                <>
                  Pesan <em>vendor</em>
                </>
              }
              note="Percakapanmu dengan vendor. Vendor mendapat email saat ada pesan baru darimu, dan kamu mendapat email saat mereka membalas."
            />
            <div className={`mt-8 ${ADM_SPLIT}`}>
              <AdmConvPane
                userId={user.id}
                basePath="/internal/admin/pesan"
                type="admin_vendor"
                searchPlaceholder="Cari nama vendor"
                emptyText="Mulai chat dari halaman detail vendor, lewat tombol Chat vendor."
              />
              <AdmPickPane title="Pilih percakapan">Balas vendor dari sini. Untuk memulai chat baru, buka halaman detail vendor.</AdmPickPane>
            </div>
          </div>
        </AdminShell>
      )}
    </WithUser>
  );
}
