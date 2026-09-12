"use client";

import { ConversationList } from "@/components/ConversationList";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";

export default function ClientMessagesPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
          <div className="mx-auto max-w-2xl px-4 py-10">
            <PageHeader title="Pesan" />
            <ConversationList
              basePath="/client/messages"
              emptyLabel="Mulai dari halaman vendor atau chat Wedding Consultant."
              currentUserId={user.id}
            />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
