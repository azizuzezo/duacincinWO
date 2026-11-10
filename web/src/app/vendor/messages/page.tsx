"use client";

import { ConversationList } from "@/components/ConversationList";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";

export default function VendorMessagesPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
            <PageHeader
              eyebrow="Pesan"
              title={
                <>
                  Pesan dari <span className="dc-em">client</span>
                </>
              }
              subtitle="Balas lewat chat ini supaya harga, tanggal, dan paket yang disepakati tercatat untuk kedua pihak."
            />
            <ConversationList
              basePath="/vendor/messages"
              emptyLabel="Belum ada client yang menghubungi. Chat dari client muncul di sini begitu mereka membuka etalasemu."
              currentUserId={user.id}
            />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
