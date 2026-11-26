"use client";

import { ADM_SPLIT, AdmChatsPane, AdmPickPane } from "@/components/admin/admPanes";
import { AdmHead } from "@/components/admin/admUi";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { WithUser } from "@/components/WithUser";

// Every client-vendor chat, most recently active first. Admins read them to
// follow up disputes and service quality; opening one is audit-logged.
export default function AdminChatsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => (
        <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
          <div className="wd-container pb-16 pt-8 sm:pt-10">
            <AdmHead
              kicker="Pengguna"
              title={
                <>
                  Percakapan <em>klien dan vendor</em>
                </>
              }
              note="Hanya baca. Tanda dibaca di kedua pihak tidak berubah, dan setiap percakapan yang kamu buka tercatat di audit log."
            />
            <div className={`mt-8 ${ADM_SPLIT}`}>
              <AdmChatsPane />
              <AdmPickPane title="Pilih percakapan">Baca percakapan untuk menindaklanjuti keluhan atau sengketa. Pesan yang ditandai berisi kontak diberi tanda merah.</AdmPickPane>
            </div>
          </div>
        </AdminShell>
      )}
    </WithUser>
  );
}
