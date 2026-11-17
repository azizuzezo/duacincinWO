"use client";

import { ConversationList } from "@/components/ConversationList";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { PAGE } from "../../_ui";

/** The vendor chats this admin started (one thread per vendor, per admin). */
export default function AdminVendorMessagesPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
          <div className={PAGE}>
            <PageHeader
              eyebrow="Layanan"
              title={
                <>
                  Pesan <span className="dc-em">vendor</span>
                </>
              }
              subtitle="Percakapanmu dengan vendor. Vendor mendapat email saat ada pesan baru darimu, dan kamu mendapat email saat mereka membalas."
            />
            <div className="max-w-3xl">
              <ConversationList
                basePath="/internal/admin/pesan"
                type="admin_vendor"
                emptyLabel="Mulai chat dari halaman detail vendor, lewat tombol Chat vendor."
                currentUserId={user.id}
              />
            </div>
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
