"use client";

import Link from "next/link";
import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { WithUser } from "@/components/WithUser";

export default function VendorMessageThreadPage({
  params,
}: PageProps<"/vendor/messages/[id]">) {
  const { id } = use(params);

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
            <Link
              href="/vendor/messages"
              className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
            >
              ← Semua Pesan
            </Link>
            <ChatThread conversationId={id} currentUserId={user.id} />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
