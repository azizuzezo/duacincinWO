"use client";

import { ConversationList } from "@/components/ConversationList";
import { ADMIN_NAV, CONSULTANT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";

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
    <Shell user={user} navItems={isAdmin ? ADMIN_NAV : CONSULTANT_NAV} loginPath="/login" eyebrow={isAdmin ? "Admin" : "Consultant"}>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title="Inbox Konsultasi" />
        <ConversationList
          basePath="/internal/consultations"
          emptyLabel="Belum ada Client yang memulai konsultasi."
          currentUserId={user.id}
        />
      </div>
    </Shell>
  );
}
