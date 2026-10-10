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
        <Shell
          user={user}
          navItems={VENDOR_NAV}
          loginPath="/login"
          eyebrow="Vendor"
        >
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <PageHeader title="Pesan dari client" />
            <ConversationList
              basePath="/vendor/messages"
              emptyLabel="Belum ada Client yang menghubungi."
              currentUserId={user.id}
            />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
