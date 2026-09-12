"use client";

import Link from "next/link";
import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { WithUser } from "@/components/WithUser";

export default function ClientMessageThreadPage({ params }: PageProps<"/client/messages/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
          <div className="mx-auto max-w-2xl px-4 py-10">
            <Link href="/client/messages" className="mb-4 inline-block text-sm font-semibold text-dc-navy hover:text-dc-gold">
              ← Semua Pesan
            </Link>
            <ChatThread conversationId={id} currentUserId={user.id} />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
